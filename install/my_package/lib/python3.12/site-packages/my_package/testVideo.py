import cv2
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage
from std_msgs.msg import String

fontType = cv2.FONT_HERSHEY_SIMPLEX

class ImagePublisher(Node):
    def __init__(self):
        # Khởi tạo node ROS 2
        super().__init__('image_publisher')

        # Tạo publisher cho topic /camera/image/compressed
        self.publisher_ = self.create_publisher(CompressedImage, '/camera/image_raw/compressed', 10)

        # Mở camera (hoặc tải hình ảnh từ file)
        self.cap = cv2.VideoCapture(0)  # Thay đổi 0 thành đường dẫn file nếu cần

        # Tạo timer để xuất bản tin nhắn liên tục ở tần suất 10 Hz
        self.timer = self.create_timer(0.1, self.timer_callback)  # 0.1 giây tương đương 10 Hz

        self.subscription = self.create_subscription(
            String,  # Replace with the actual message type you want to subscribe to
            'featureTopic',
            self.listener_callback,
            10
        )
        self.feature = ''

    def timer_callback(self):
        ret, frame = self.cap.read()
        if not ret:
            self.get_logger().error("Failed to grab frame from camera. Exiting...")
            self.cap.release()
            rclpy.shutdown()
            return
        if self.feature == 'face':
            cv2.putText(frame, self.feature, (20, 20), fontType, 1, (255, 0, 0), 3, 0, 0)
        elif self.feature == 'color':
            cv2.putText(frame, self.feature, (20, 20), fontType, 1, (255, 0, 0), 3, 0, 0)
        elif self.feature == 'gesture':
            cv2.putText(frame, self.feature, (20, 20), fontType, 1, (255, 0, 0), 3, 0, 0)

        # Nén hình ảnh thành JPEG
        _, buffer = cv2.imencode('.jpg', frame)  # Nén hình ảnh
        jpeg_image = buffer.tobytes()  # Chuyển đổi thành bytes

        # Tạo đối tượng tin nhắn CompressedImage
        compressed_image_msg = CompressedImage()
        compressed_image_msg.header.stamp = self.get_clock().now().to_msg()  # Lấy thời gian hiện tại
        compressed_image_msg.format = "jpeg"
        compressed_image_msg.data = jpeg_image

        # Xuất bản tin nhắn
        self.publisher_.publish(compressed_image_msg)
        self.get_logger().info("Published compressed image")

    def listener_callback(self, msg):
        self.feature = msg.data

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
