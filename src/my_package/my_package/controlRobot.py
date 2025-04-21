import cv2
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage
from std_msgs.msg import String
from geometry_msgs.msg import Twist
import DOGZILLALib as dog
import json
from my_package.voice import VoiceCtrl
import subprocess

from my_package.color_processing import ColorRecognition
from my_package.face_processing import FaceRecognition
from my_package.gesture_processing import GestureRecognition
from my_package.object_processing import ObjectRecognition

fontType = cv2.FONT_HERSHEY_SIMPLEX


class ImagePublisher(Node):
    def __init__(self):
        # Khởi tạo node ROS 2
        super().__init__('image_publisher')

        self.dogControl = dog.DOGZILLA()

        # Tạo publisher cho topic /camera/image/compressed
        self.publisherImage = self.create_publisher(
            CompressedImage, '/camera/image_raw/compressed', 10)
        self.publisherBattery = self.create_publisher(
            String, '/batteryTopic', 10)
        self.publisherGestureResult = self.create_publisher(
            String, '/gestureResultTopic', 10)

        # Mở camera (hoặc tải hình ảnh từ file)
        # Thay đổi 0 thành đường dẫn file nếu cần
        self.cap = cv2.VideoCapture(0)
        # self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 400)
        # self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 400)
        # Tạo timer để xuất bản tin nhắn liên tục ở tần suất 10 Hz
        # 0.1 giây tương đương 10 Hz
        self.timer = self.create_timer(0.1, self.imagePublish)

        self.subscriptionFeature = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            'featureTopic',
            self.feature_callback,
            10
        )
        # self.subscriptionControl = self.create_subscription(
        #     Twist,  # Replace with the actual message type you want to subscribe to
        #     '/cmd_vel',
        #     self.control_callback,
        #     10
        # )
        self.subscriptionControl = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            '/voiceTopic',
            self.voice_callback,
            10
        )
        self.subscriptionControl = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            '/colorChoice',
            self.color_choice_callback,
            10
        )
        self.subscriptionControl = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            '/notifyGamepadControl',
            self.notifyGamepadControl_callback,
            10
        )

        self.feature = ''
        self.face_processing = FaceRecognition()
        self.color_processing = ColorRecognition()
        self.gesture_processing = GestureRecognition()
        self.voiceControl = VoiceCtrl()
        self.object_processing = ObjectRecognition()

        self.objectType = "Rectangle"
        self.l_h = 50,
        self.l_s = 100,
        self.l_v = 50,
        self.u_h = 95,
        self.u_s = 255,
        self.u_v = 255,

        self.tracking = False
        self.voiceOn = False
        self.faceOn = False

        self.frame_count = 0

    def imagePublish(self):
        ret, frame = self.cap.read()
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 500)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 400)
        if not ret:
            self.get_logger().error("Failed to grab frame from camera. Exiting...")
            self.cap.release()
            rclpy.shutdown()
            return
        if self.feature == 'face':
            if not self.faceOn:
                self.face_processing.load_variable()
                self.faceOn = True
            frame, name, faceLocation = self.face_processing.face_function(
                frame)
            self.frame_count += 1
            if self.frame_count > 5:
                if (name != "Unknown Person"):
                    top, right, bottom, left = faceLocation
                    center_x = (left + right) / 2
                    center_y = (top + bottom) / 2
                    radius = min((bottom - top) / 2, (right - left) / 2)
                    self.robot_tracking(
                        frame, center_x, center_y, radius)
                    self.frame_count = 0
        elif self.feature == "faceOff":
            self.face_processing.remove_variable()
            self.faceOn = False
        elif self.feature == 'object':
            frame, Cx, Cy, largest_contour = self.object_processing.object_function(
                frame, self.l_h, self.l_s, self.l_v, self.u_h, self.u_s, self.u_v, self.objectType)
            if largest_contour is not None:
                (Cx_estimate, Cy_estimate), radius = cv2.minEnclosingCircle(
                    largest_contour)
                self.frame_count += 1
                if self.frame_count > 5:
                    self.robot_tracking(
                        frame, Cx, Cy, radius)
                    self.frame_count = 0
        elif self.feature == 'gesture':
            self.gesture_processing.loadGesture()
            gestureResult = String()
            frame, gestureResult_value = self.gesture_processing.gesture_function(
                frame)
            gestureResult.data = gestureResult_value
            self.publisherGestureResult.publish(gestureResult)
            if gestureResult_value == "Lie Down":
                self.dogControl.action(1)
            elif gestureResult_value == "Stand up":
                self.dogControl.action(2)
            elif gestureResult_value == "Turn around":
                self.dogControl.action(4)
            elif gestureResult_value == "Sit down":
                self.dogControl.action(12)
            elif gestureResult_value == "Reset":
                self.dogControl.action(0xff)

        # Nén hình ảnh thành JPEG
        _, buffer = cv2.imencode('.jpg', frame)  # Nén hình ảnh
        jpeg_image = buffer.tobytes()  # Chuyển đổi thành bytes

        # Tạo đối tượng tin nhắn CompressedImage
        compressed_image_msg = CompressedImage()
        compressed_image_msg.header.stamp = self.get_clock(
        ).now().to_msg()  # Lấy thời gian hiện tại
        compressed_image_msg.format = "jpeg"
        compressed_image_msg.data = jpeg_image

        # Xuất bản tin nhắn
        self.publisherImage.publish(compressed_image_msg)
        # self.get_logger().info("Published compressed image")

        battery_data = self.dogControl.read_battery()
        battery_data_json = json.dumps(battery_data)

        self.publisherBattery.publish(battery_data_json)

        if self.voiceOn == True:
            self.voiceControl.send_twist()

    def feature_callback(self, msg):
        # Put the message to the feature to process the feature (face/color/gesture)
        self.feature = msg.data

    def voice_callback(self, msg):
        # On/Off the voice
        if msg.data == 'on':
            self.voiceOn = True
            print("Voice is on...")
            self.voiceControl.send_twist()
        else:
            self.voiceOn = False
            print("Voice is off...")

    def color_choice_callback(self, msg):
        if msg.data == "tracking":
            self.tracking = True
        elif msg.data == "untracking":
            self.tracking = False
        else:
            msgReturn = msg.data
            msgObject = msgReturn.split("#")
            self.objectType = msgObject[0]
            self.l_h = int(msgObject[1])
            self.l_s = int(msgObject[2])
            self.l_v = int(msgObject[3])
            self.u_h = int(msgObject[4])
            self.u_s = int(msgObject[5])
            self.u_v = int(msgObject[6])

    def robot_tracking(self, frame, center_x, center_y, radius):
        if radius > 10:
            # 将检测到的颜色标记出来  Mark the detected color
            cv2.circle(frame, (int(center_x), int(center_y)),
                       int(radius), (255, 0, 255), 2)
            value_x = center_x - 250
            value_y = center_y - 200
            if value_x > 110:
                value_x = 110
            elif value_x < -110:
                value_x = -110
            if value_y > 150:
                value_y = 150
            elif value_y < -150:
                value_y = -150

            if (value_x > 10 or value_x < -10) and (value_y > 10 or value_y < -10):
                self.dogControl.attitude(['y', 'p'], [-value_x/10, value_y/10])

        cv2.putText(frame, "Tracking", (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 255), 2)

    def voice_callback(self, msg):
        # On/Off the gamepad Control
        if msg.data == 'on':
            pass
        else:
            pass


def main(args=None):
    rclpy.init(args=args)

    # Tạo và chạy node ImagePublisher
    image_publisher = ImagePublisher()

    try:
        rclpy.spin(image_publisher)
    except KeyboardInterrupt:
        pass
    finally:
        # Đóng camera khi dừng node
        image_publisher.cap.release()
        image_publisher.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
