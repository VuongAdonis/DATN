import cv2
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage
from std_msgs.msg import String
from geometry_msgs.msg import Twist

from my_package.color_processing import ColorRecognition
from my_package.face_processing import FaceRecognition
from my_package.gesture_processing import GestureRecognition

fontType = cv2.FONT_HERSHEY_SIMPLEX

class ImagePublisher(Node):
    def __init__(self):
        # Khởi tạo node ROS 2
        super().__init__('image_publisher')

        # Tạo publisher cho topic /camera/image/compressed
        self.publisherImage = self.create_publisher(CompressedImage, '/camera/image_raw/compressed', 10)
        self.publisherBattery = self.create_publisher(String, '/batteryTopic', 10)

        # Mở camera (hoặc tải hình ảnh từ file)
        self.cap = cv2.VideoCapture(0)  # Thay đổi 0 thành đường dẫn file nếu cần
        # self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 400)
        # self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 400)
        # Tạo timer để xuất bản tin nhắn liên tục ở tần suất 10 Hz
        self.timer = self.create_timer(0.1, self.imagePublish)  # 0.1 giây tương đương 10 Hz

        self.subscriptionFeature = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            'featureTopic',
            self.feature_callback,
            10
        )
        self.subscriptionControl = self.create_subscription(
            Twist,  # Replace with the actual message type you want to subscribe to
            '/cmd_vel',
            self.control_callback,
            10
        )
        self.subscriptionControl = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            '/colorChoice',
            self.color_choice_callback,
            10
        )

        self.feature = ''
        self.face_processing = FaceRecognition()
        self.color_processing = ColorRecognition()
        self.gesture_processing = GestureRecognition()
        self.color = "green"
        self.tracking = False

    def imagePublish(self):
        ret, frame = self.cap.read()
        if not ret:
            self.get_logger().error("Failed to grab frame from camera. Exiting...")
            self.cap.release()
            rclpy.shutdown()
            return
        if self.feature == 'face':
            self.face_processing.load_variable()
            frame = self.face_processing.face_function(frame)
        elif self.feature == "faceOff":
            self.face_processing.remove_variable()
        elif self.feature == 'color':
            frame = self.color_processing.color_function(frame, self.color, self.tracking)
        elif self.feature == 'gesture':
            frame = self.gesture_processing.gesture_function(frame)

        # Nén hình ảnh thành JPEG
        _, buffer = cv2.imencode('.jpg', frame)  # Nén hình ảnh
        jpeg_image = buffer.tobytes()  # Chuyển đổi thành bytes

        # Tạo đối tượng tin nhắn CompressedImage
        compressed_image_msg = CompressedImage()
        compressed_image_msg.header.stamp = self.get_clock().now().to_msg()  # Lấy thời gian hiện tại
        compressed_image_msg.format = "jpeg"
        compressed_image_msg.data = jpeg_image

        # Xuất bản tin nhắn
        self.publisherImage.publish(compressed_image_msg)
        self.get_logger().info("Published compressed image")

    def feature_callback(self, msg):
        # Put the message to the feature to process the feature (face/color/gesture)
        self.feature = msg.data

    def control_callback(self, msg):
        # On/Off the voice
        if msg.data ==  '':
            print("Voice is on...")
        else:
            print("Voice is off...")

    def color_choice_callback(self, msg):
        if msg.data == "tracking":
            self.tracking = True
        elif msg.data == "untracking":
            self.tracking = False
        else:
            self.color = msg.data


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
