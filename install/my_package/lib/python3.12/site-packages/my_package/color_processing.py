import cv2
from my_package.color_utils import get_limits
import numpy as np


class ColorRecognition:
    def __init__(self):

        self.colors = {
            "yellow": [255, 255, 0],
            "red"   : [0, 0, 255],
            "green" : [0, 255, 0],
            "blue"  : [250, 0, 0]
        }

        self.cnt = None
        self.font = cv2.FONT_HERSHEY_SIMPLEX

    def color_function(self, frame, colorInput, tracking):
        hsvImage = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        if colorInput != "red":
            lowerLimit, upperLimit = get_limits(color=self.colors[colorInput])

            """
            Create a mask for the color we want
            """
            mask = cv2.inRange(hsvImage, lowerLimit, upperLimit)
        else:
            lowerLimit1 = 0, 100, 100
            upperLimit1 = 5, 255, 255
            mask1 = cv2.inRange(hsvImage, lowerLimit1, upperLimit1)

            lowerLimit2 = 350, 100, 100
            upperLimit2 = 355, 255, 255
            mask2 = cv2.inRange(hsvImage, lowerLimit2, upperLimit2)

            mask = cv2.bitwise_or(mask1, mask2)

        """
        Create the bounding box for the color we want to detect
        """
        # Tìm các thành phần kết nối
        # num_labels: so luong thanh phan ket  noi duoc tim thay. Bao gom ca background
        # labels_im: mot mang co cung kich thuoc voi anh dau vao,, trong do
        # tung pixel dduoc gan 1 nhan khac nhau cho tung thanh phan ket noi
        # num_labels, labels_im = cv2.connectedComponents(mask.astype(np.uint8))
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Biến đổi thành phần lớn nhất thành bounding box
        # largest_area = 0
        largest_bbox = None

        # for label in range(1, num_labels):  # Bắt đầu từ 1 để bỏ qua background
        # for contour in cnts:
        #     # Tính diện tích của thành phần
        #     area = cv2.contourArea(contour) 
            
        #     if area > largest_area:  # Kiểm tra nếu diện tích lớn nhất
        #         largest_area = area
        #         self.cnt = contour
        #         # Tạo bounding box
        #         # y, x = np.where(labels_im == label)  # Lấy tọa độ của pixel thuộc thành phần này
        #         x, y, w, h = cv2.boundingRect(contour)
        #         # bbox = (x.min(), y.min(), x.max(), y.max())  # xmin, ymin, xmax, ymax
        #         largest_bbox = (x, y, x+w, y+h)
        #         # largest_bbox = bbox
        if len(cnts) > 0:
            self.cnt = max (cnts, key = cv2.contourArea)
            x, y, w, h = cv2.boundingRect(self.cnt)
            largest_bbox = (x, y, x+w, y+h)

        if largest_bbox is not None:
            x1, y1, x2, y2 = largest_bbox

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 5)
        
        if(tracking == True):
            self.color_tracking(frame, self.cnt)

        return frame

    def color_tracking(self, frame, cnt):
        (color_x,color_y),color_radius = cv2.minEnclosingCircle(cnt)
        if color_radius > 10:
            # 将检测到的颜色标记出来  Mark the detected color
            cv2.circle(frame,(int(color_x),int(color_y)),int(color_radius),(255,0,255),2)  
            value_x = color_x - 320
            value_y = color_y - 240
            if value_x > 110:
                value_x = 110
            elif value_x < -110:
                value_x = -110
            if value_y > 150:
                value_y = 150
            elif value_y < -150:
                value_y = -150
            # g_dog.attitude(['y','p'],[-value_x/10, value_y/10])
        
        cv2.putText(frame, "Tracking", (50, 50), self.font, 0.75, (0, 0, 255), 2)