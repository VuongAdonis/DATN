# import cv2
# import face_recognition as FR
# import os

# """
# Note: Numpy > 2.x.x will raise error when use face_recognition
# So you need to download numpy 1.x.x
# _Vuongadonis_
# """


# class FaceRecognition:
#     def __init__(self):   
#         self.imgDir = 'C:/Users/Acer/Desktop/AI_for_LVTN/3_faceDetection/demoImages/liveWebcam'
#         self.knownEncodings = []
#         self.names = []
#         self.font = cv2.FONT_HERSHEY_SIMPLEX

#     def load_variable(self):
#         for root, dirs, files in os.walk(self.imgDir):
#             for file in files:
#                 fullFilePath = os.path.join(root, file)
#                 name = os.path.splitext(file)[0]
#                 knownFace = FR.load_image_file(fullFilePath)
#                 knownFaceEncode = FR.face_encodings(knownFace)[0]

#                 self.knownEncodings.append(knownFaceEncode)
#                 self.names.append(name)

#     def remove_variable(self):
#         self.knownEncodings = []
#         self.names = []

#     def face_function(self, frame):
#         unknownFaceRGB = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         faceLocations = FR.face_locations(unknownFaceRGB)
#         unknownEncodings = FR.face_encodings(unknownFaceRGB, faceLocations)

#         for faceLocation, unknownEncoding in zip(faceLocations, unknownEncodings):
#             top, right, bottom, left = faceLocation
#             print(faceLocation)
#             cv2.rectangle(frame, (left, top),
#                         (right, bottom), (255, 0, 0), 3)
#             name = 'Unknown Person'
#             matches = FR.compare_faces(self.knownEncodings, unknownEncoding)
#             print(matches)
#             if True in matches:
#                 matchIndex = matches.index(True)
#                 # print(matchIndex)
#                 # print(self.names[matchIndex])
#                 name = self.names[matchIndex]
#             cv2.putText(frame, name, (left, top), self.font, 0.75, (0, 0, 255), 2)
            
#         return frame

import cv2
class FaceRecognition:
    def __init__(self):   
        self.knownEncodings = []
        self.names = []
        self.font = cv2.FONT_HERSHEY_SIMPLEX

    def load_variable(self):
        print("Load face done ...")

    def remove_variable(self):
        self.knownEncodings = []
        self.names = []

        print("Remove face done ...")

    def face_function(self, frame):
        
        cv2.putText(frame, "Face", (50, 50), self.font, 0.75, (0, 0, 255), 2)
        return frame