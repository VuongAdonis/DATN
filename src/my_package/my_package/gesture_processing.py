import cv2
import numpy as np
import pickle
import time


class mpHands:
    import mediapipe as mp

    def __init__(self, maxHands=2, tol1=0.5, modelComplexity=1, tol2=0.5):
        self.tol1 = tol1
        self.tol2 = tol2
        self.maxHands = maxHands
        self.modelComplexity = modelComplexity
        self.hands = self.mp.solutions.hands.Hands(
            False, self.maxHands, self.modelComplexity, self.tol1, self.tol2)

    def Marks(self, frame, width, height):
        myHands = []
        frameRGB = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(frameRGB)
        if results.multi_hand_landmarks != None:
            for handLandMarks in results.multi_hand_landmarks:
                myHand = []
                for landMark in handLandMarks.landmark:
                    myHand.append(
                        (int(landMark.x*width), int(landMark.y*height)))
                myHands.append(myHand)
        return myHands


class GestureRecognition:
    def __init__(self):
        self.width = 640
        self.height = 480
        self.findHands = mpHands(1)
        self.keyPoints = [0, 4, 5, 9, 13, 17, 8, 12, 16, 20]
        self.gestNames = []
        self.knownGestures = []

    def loadGesture(self):
        trainPath = 'C:/Users/Acer/Desktop/DHBK/HK242/DATN/DATN/src/my_package/train/gesture/default.pkl'
        with open(trainPath, 'rb') as f:
            self.gestNames = pickle.load(f)
            self.knownGestures = pickle.load(f)

        self.tol = 10

    def removeGesture(self):
        self.gestNames = []
        self.knownGestures = []

    def findDistances(self, handData):
        distMatrix = np.zeros([len(handData), len(handData)], dtype='float')
        palmSize = ((handData[0][0]-handData[9][0])
                    ** 2 + (handData[0][1]-handData[9][1])**2)**(1./2.)
        for row in range(0, len(handData)):
            for col in range(0, len(handData)):
                distMatrix[row][col] = (((handData[row][0]-handData[col][0])
                                        ** 2 + (handData[row][1]-handData[col][1])**2)**(1./2.))/palmSize
        return distMatrix

    def findError(self, gestureMatrix, unknownMatrix, keyPoints):
        error = 0
        for row in keyPoints:
            for col in keyPoints:
                error = error + \
                    abs(gestureMatrix[row][col]-unknownMatrix[row][col])
        return error

    def findGesture(self, unknownGesture, knownGestures, keyPoints, gestNames, tol):
        errorArray = []
        for i in range(0, len(gestNames), 1):
            error = self.findError(knownGestures[i], unknownGesture, keyPoints)
            errorArray.append(error)
        errorMin = errorArray[0]
        minIndex = 0
        for i in range(0, len(errorArray), 1):
            if errorArray[i] < errorMin:
                errorMin = errorArray[i]
                minIndex = i
        if errorMin < tol:
            gesture = gestNames[minIndex]
        if errorMin >= tol:
            gesture = 'Unknown'
        return gesture

    def gesture_function(self, frame):
        prevTime = time.time()
        frame = cv2.resize(frame, (self.width, self.height))
        handData = self.findHands.Marks(frame, self.width, self.height)
        # if train == 1:
        #     if handData != []:
        #         print('Please show gesture ',
        #               self.gestNames[trainCnt], ': Press t when Ready')
        #         if cv2.waitKey(1) & 0xff == ord('t'):
        #             knownGesture = self.findDistances(handData[0])
        #             self.knownGestures.append(knownGesture)
        #             trainCnt = trainCnt+1
        #             if trainCnt == self.numGest:
        #                 train = 0
        #                 with open(self.trainName, 'wb') as f:
        #                     pickle.dump(self.gestNames, f)
        #                     pickle.dump(self.knownGestures, f)

        # if train == 0:
        myGesture = "unknown"
        if handData != []:
            unknownGesture = self.findDistances(handData[0])
            # error = findError(knownGesture, unknownGesture, keyPoints)
            myGesture = self.findGesture(
                unknownGesture, self.knownGestures, self.keyPoints, self.gestNames, self.tol)
            cv2.putText(frame, myGesture, (100, 175),
                        cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 0, 0), 8)

        for hand in handData:
            for ind in self.keyPoints:
                cv2.circle(frame, hand[ind], 25, (255, 0, 255), 3)
        curTime = time.time()
        print("Time to process: ", curTime - prevTime)
        return frame, myGesture
