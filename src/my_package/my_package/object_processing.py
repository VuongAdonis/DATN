import cv2
import numpy as np
import time


class ObjectRecognition:
    def __init__(self):
        self.objectLen = None
        self.flag = False
        self.Cx = 0
        self.Cy = 0
        self.largest_contour = None

    def object_function(self, frame, l_h, l_s, l_v, u_h, u_s, u_v, objectType):
        prevTime = time.time()
        if objectType == "Rectangle":
            self.objectLen = 4
        elif objectType == "Triangle":
            self.objectLen = 3
        elif objectType == "Circle":
            self.objectLen = 5
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        lower = np.array([l_h, l_s, l_v], dtype=np.uint8)

        upper = np.array([u_h, u_s, u_v], dtype=np.uint8)

        mask = cv2.inRange(hsv, lower, upper)
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.erode(mask, kernel)

        contours, _ = cv2.findContours(
            mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        self.largest_contour = None
        largest_area = 0
        for cnt in contours:
            self.flag = False
            area = cv2.contourArea(cnt)

            if area > largest_area:
                checkContour = cnt
                approx = cv2.approxPolyDP(
                    checkContour, 0.02*cv2.arcLength(checkContour, True), True)
                if self.objectLen == 4 or self.objectLen == 3:
                    if len(approx) == self.objectLen:
                        self.flag = True
                elif self.objectLen == 5:
                    if len(approx) >= self.objectLen:
                        self.flag = True
                if self.flag == True:
                    largest_area = area
                    self.largest_contour = cnt

            # area = cv2.contourArea(cnt)
            # if area > largest_area:
            #     largest_area = area
            #     self.largest_contour = cnt
            # if self.largest_contour is not None:
            #     approx = cv2.approxPolyDP(
            #         self.largest_contour, 0.02*cv2.arcLength(self.largest_contour, True), True)

        if self.largest_contour is not None:
            area = cv2.contourArea(self.largest_contour)
            approx = cv2.approxPolyDP(
                self.largest_contour, 0.02*cv2.arcLength(self.largest_contour, True), True)
            # x = approx.ravel()[0]
            # y = approx.ravel()[1]

            if area > 450:
                result = "Object"
                M = cv2.moments(self.largest_contour)
                if M['m00'] != 0:
                    self.Cx = int(M['m10'] / M['m00'])
                    self.Cy = int(M['m01'] / M['m00'])
                else:
                    self.Cx, self.Cy = 0, 0

                cv2.drawContours(frame, [approx], 0, (0, 0, 0), 5)
                if len(approx) == 3:
                    cv2.putText(frame, "Triangle", (self.Cx, self.Cy),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0))
                elif len(approx) == 4:
                    cv2.putText(frame, "Rectangle", (self.Cx, self.Cy),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0))
                elif len(approx) >= 5:
                    cv2.putText(frame, "Circle", (self.Cx, self.Cy),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0))
            else:
                self.largest_contour = None
        curTime = time.time()
        print("Time to process: ", curTime - prevTime)
        return frame, self.Cx, self.Cy, self.largest_contour
