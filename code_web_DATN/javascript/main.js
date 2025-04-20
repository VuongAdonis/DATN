function controlInit() {
const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            connected: JSON.parse(localStorage.getItem('connected')) || false,
            ros: null,
            logs: JSON.parse(localStorage.getItem('logs')) || [],
            topic: null,
            message: null,
            // ws_address: localStorage.getItem('ws_address') || 'ws://localhost:9090',
            ws_address: localStorage.getItem('ws_address') || 'ws://192.168.1.221:9090',
            voiceOn: true,

            voiceTopic: null,
            featureTopic: null,
            batteryTopic: null,
            imageTopic: null,

            voiceActive: false,
            faceAtive: false,
            gestureActive: false,
            colorActive: false,
            trackingActive: false,
            selectedColor: "green",

            voiceRos: null,
            showFaceOptions: false,
            showColorOptions: false,
            showGestureResult: false,
            gestureResult: 'unknown',
            selectedColorOption: '',
            activeFeature: false,
            activeTracking: false,
            batteryLevel: '--',

            // Variable for Joystick
            joystickNormal : null,
            handleNormal : null,

            joystickLimited : null,
            handleLimited : null,

            paintNormal : false,
            paintLimited : false,
            coordNormal : null,
            coordLimited : null,
            xOrigNormal : null,
            yOrigNormal : null,
            radiusNormal : null,
            xOrigLimited : null,
            yOrigLimited : null,
            radiusLimited : null,
            command: null,
            oldCommand: "oldCommand",

            LowHue: 50,  // Giá trị khởi tạo của slider
            LowSaturation: 100,
            LowValue: 50,
            HighHue: 95,
            HighSaturation: 255,
            HighValue: 255,
        };
    },
    methods: {
          connect() {
            this.ros = new ROSLIB.Ros({
                url: this.ws_address
            });
            
            console.log("ros attribute: ", this.ros)
            this.setTopic();
            this.subscribeToCamera();

            this.ros.on('connection', () => {
                this.connected = true;
                this.logs.unshift('Connected to websocket server.');
                this.saveState();
            });

            this.ros.on('error', (error) => {
                this.connected = false;
                this.logs.unshift('Error connecting to websocket server: ', error);
                this.saveState();
            });

            this.ros.on('close', () => {
                this.connected = false;
                this.logs.unshift('Connection to websocket server closed.');
                this.saveState();
                this.disconnect()
            });

            this.subscribeToBattery()
            this.setJoystick()
        },
        disconnect() {
            if (this.ros) {
                this.ros.close();
                this.connected = false;
                this.logs.unshift('Disconnected from websocket server.');
                this.saveState();
                // window.location.href = 'startPage.html';
            }
        },
        saveState() {
            // localStorage.setItem('connected', JSON.stringify(this.connected));
            // localStorage.setItem('ws_address', this.ws_address);
            localStorage.setItem('logs', JSON.stringify(this.logs));
            // localStorage.setItem('ros', JSON.stringify(this.ros));
        },
        setTopic() {
            this.topic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            });

            this.featureTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/featureTopic',
                messageType: 'std_msgs/String'
            });
            this.colorTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: 'colorChoice', // Tên topic mà camera phát
                messageType: 'std_msgs/String'
            });
            this.voiceTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/voiceTopic',
                messageType: 'std_msgs/String'
            });
            this.imageTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: '/camera/image_raw/compressed', // Tên topic mà camera phát
                messageType: 'sensor_msgs/msg/CompressedImage'
            });
            this.batteryTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: 'batteryTopic', // Tên topic mà camera phát
                messageType: 'std_msgs/String'
            });
            this.gestureResultTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: 'gestureResultTopic', // Tên topic mà camera phát
                messageType: 'std_msgs/String'
            });

            // gestureResult

        },

        setJoystick() {
            // div chứa joystick cho việc di chuyển
            this.joystickNormal = document.getElementById('joystick-normal');
            // phần tử con của cái div trên, cái joystick
            this.handleNormal = this.joystickNormal.querySelector('.handle');
            // div chứa joystick cho việc xoay
            this.joystickLimited = document.getElementById('joystick-limited');
            // phần tử con của div trên, cái joystick
            this.handleLimited = this.joystickLimited.querySelector('.handle');

            // biến kiểm tra joystick có đang được vẽ không
            this.paintNormal = false;
            this.paintLimited = false;

            // Tọa độ joystick
            this.coordNormal = { x: 0, y: 0 };
            this.coordLimited = { x: 0, y: 0 };
            
            // Tọa độ tâm và bán kính joystick
            this.xOrigNormal = this.joystickNormal.offsetWidth / 2;
            this.yOrigNormal = this.joystickNormal.offsetHeight / 2;
            this.radiusNormal = this.joystickNormal.offsetWidth / 2 - 25;

            this.xOrigLimited = this.joystickLimited.offsetWidth / 2;
            this.yOrigLimited = this.joystickLimited.offsetHeight / 2;
            this.radiusLimited = this.joystickLimited.offsetWidth / 2 - 25;

            // Lắng nghe mouseup trên document để reset joystick khi thả chuột ở bất kỳ đâu
            document.addEventListener('mouseup', this.stopDrawingNormal);
            document.addEventListener('mouseup', this.stopDrawingLimited);

            this.joystickNormal.addEventListener('mousedown', this.startDrawingNormal);
            document.addEventListener('mousemove', this.DrawNormal); // Lắng nghe mousemove trên document

            this.joystickLimited.addEventListener('mousedown', this.startDrawingLimited);
            document.addEventListener('mousemove', this.DrawLimited); // Lắng nghe mousemove trên document
        },

        forward() {
            this.message = new ROSLIB.Message({
                linear: { x: 1, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move forward.');
        },
        stop() {
            this.message = new ROSLIB.Message({
                linear: { x: 0, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move stop.');
        },
        turnLeft() {
            this.message = new ROSLIB.Message({
                linear: { x: 0.5, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0.5, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move turnLeft.');
        },
        turnRight() {
            this.message = new ROSLIB.Message({
                linear: { x: 0.5, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: -0.5, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move turnRight.');
        },
        backward() {
            this.message = new ROSLIB.Message({
                linear: { x: -1, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move backward.');
        },
        moveLeft() {
            this.message = new ROSLIB.Message({
                linear: { x: 0, y: 1, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move left.');
        },
        moveRight() {
            this.message = new ROSLIB.Message({
                linear: { x: 0, y: -1, z: 0, },
                angular: { x: 0, y: 0, z: 0, },
            });
            this.setTopic();
            this.topic.publish(this.message);
            this.logs.unshift('Command move right.');
        },
        lookUp() {
            // this.message = new ROSLIB.Message({
            //     linear: { x: -1, y: 0, z: 0, },
            //     angular: { x: 0, y: 0, z: 0, },
            // });
            // this.setTopic();
            // this.topic.publish(this.message);
            this.logs.unshift('Command look up');
        },
        bowDown() {
            // this.message = new ROSLIB.Message({
            //     linear: { x: -1, y: 0, z: 0, },
            //     angular: { x: 0, y: 0, z: 0, },
            // });
            // this.setTopic();
            // this.topic.publish(this.message);
            this.logs.unshift('Command bow down.');
        },

        onVoice() {
            this.voiceOn = false
            this.logs.unshift('Connected to Voice topic.');
            const voiceMesg = {
                data: "on"  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
            };
            this.voiceTopic.publish(voiceMesg);
        },
        offVoice() {
            const voiceMesg = {
                data: "off"  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
            };
            this.voiceOn = true
            this.logs.unshift('Turn off Voice topic.');
            this.voiceTopic.publish(voiceMesg);
        },
        subscribeToCamera() {
            
            this.logs.unshift('UpdateCamera.');
            this.imageTopic.subscribe((message) => {
                const img = new Image();
                img.src = 'data:image/jpeg;base64,' + message.data; // Chuyển đổi dữ liệu thành base64
                document.getElementById('camera-view').innerHTML = ''; // Xóa nội dung cũ
                document.getElementById('camera-view').appendChild(img); // Thêm hình ảnh mới
            });
        },
        subscribeToBattery() {
            this.logs.unshift('Update Battery.');
            this.batteryTopic.subscribe((message) => {
                this.batteryLevel = message.data;
            });
        },
        saved() {

        },
        add() {

        },
        pickColor() {

        },
        hsv() {

        },
        tracking() {
            // this.activeTracking = !this.activeTracking;
            if( this.activeTracking === false ) {
                this.logs.unshift('Tracking Object.');
                const trackingMesg = {
                    data: "tracking"  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
                };
                this.colorTopic.publish(trackingMesg);
                this.activeTracking = true
            }
            else{
                this.logs.unshift('Stop tracking.');
                const trackingMesg = {
                    data: "untracking"  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
                };
                this.colorTopic.publish(trackingMesg);
                this.activeTracking = false
            }
        },
        gesture() {
            this.showGestureResult = ! this.showGestureResult;
        },
        onColorChange() {
            // This function gets called whenever a radio button is selected.
            console.log(this.selectedColorOption); // Log the selected option
            // You can add additional logic here based on the selected option
            if (this.selectedColorOption === 'Pick Color') {
                // Call function for Pick Color
                console.log("Pick object selected");
                // this.handlePickObject();
            } 

        },
        handlePickObject() {
            // Logic for handling Pick Color
            // console.log("Pick Color selected");
            this.logs.unshift('Choose ' + this.selectedColor + " object");
            const msgData = (this.selectedColor + "#" + this.LowHue + "#" + this.LowSaturation + "#" + this.LowValue + "#" + this.HighHue + "#" + this.HighSaturation + "#" +  this.HighValue)
            const colorMesg = {
                
                data: msgData,  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
            };
            this.colorTopic.publish(colorMesg)
        },
        handleHSV() {
            // Logic for handling HSV
            console.log("HSV selected");
            // Add your code for handling the "HSV" action
        },
        sendFeatureMsg(feature) {
            this.logs.unshift('Connected to ' + feature + ' topic.');
            const featureMsg = {
                data: feature  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
            };
            console.log('feature: ' + feature);
            if (feature !== ''){
                this.featureTopic.publish(featureMsg);
            }
            
        },
        activate(feature) {
            // Set the active feature and toggle options based on the feature activated
            if (this.activeFeature === feature) {
                this.activeFeature = '';
                this.showFaceOptions = false;
                this.showColorOptions = false;
                this.showGestureResult = false;
                this.sendFeatureMsg("offFeature");
                return;
            }
            this.activeFeature = feature;

            // Toggle Face Options
            if (feature === 'face') {
                this.showFaceOptions = !this.showFaceOptions;
                this.showColorOptions = false; // Hide Color options
                this.activeTracking = false;
                this.showGestureResult = false;
                this.sendFeatureMsg(feature);
            } 
            // Toggle Color Options
            else if (feature === 'object') {
                this.showColorOptions = !this.showColorOptions;
                this.showFaceOptions = false; // Hide Face options
                this.showGestureResult = false;
                this.sendFeatureMsg(feature);
            } 
            // If Gesture is clicked, ensure other options are closed
            else {
                this.showFaceOptions = false; // Hide Face options
                this.showColorOptions = false; // Hide Color options
                this.activeTracking = false;
                this.gesture();
                this.sendFeatureMsg(feature);
                this.gestureResultTopic.subscribe((message) => {
                    this.gestureResult = message.data;
                    
                    // if (this.gestureResult == "forward") {
                    //     this.forward()
                    // }
                    // else if (this.gestureResult == "backward") {
                    //     this.backward()
                    // }
                    // else if (this.gestureResult == "left") {
                    //     this.turnLeft()
                    // }
                    // else if (this.gestureResult == "right") {
                    //     this.turnRight()
                    // }
                    // else if (this.gestureResult == "stop") {
                    //     this.stop()
                    // }
                    // else{
                    //     // unknown = stop
                    //     this.stop()
                    // }
                })
        }
        },
        startDrawingNormal(event) {
            this.paintNormal = true;
            this.DrawNormal(event); // Cập nhật ngay khi bắt đầu
        },
        stopDrawingNormal() {
            this.paintNormal = false;
            this.handleNormal.style.top = `${this.yOrigNormal - 25}px`;
            this.handleNormal.style.left = `${this.xOrigNormal - 25}px`;
            this.sendMove("Stop")
            //this.send(0, 0, 0, 0); // Reset send
        },
        DrawNormal(event) {
            if (this.paintNormal) {
                var mouse_x = event.clientX || event.touches[0].clientX;
                var mouse_y = event.clientY || event.touches[0].clientY;

                // Tọa độ tương đối của điểm chạm so với tâm
                this.coordNormal.x = mouse_x - this.joystickNormal.offsetLeft;
                this.coordNormal.y = mouse_y - this.joystickNormal.offsetTop;

                // Tính toán khoảng cách từ tâm
                let distance = Math.sqrt(Math.pow(this.coordNormal.x - this.xOrigNormal, 2) + Math.pow(this.coordNormal.y - this.yOrigNormal, 2));

                if (distance > this.radiusNormal) {
                    // Tính toán lại vị trí trên vành dựa trên góc mới
                    let angle = Math.atan2(this.coordNormal.y - this.yOrigNormal, this.coordNormal.x - this.xOrigNormal);
                    this.coordNormal.x = this.radiusNormal * Math.cos(angle) + this.xOrigNormal;
                    this.coordNormal.y = this.radiusNormal * Math.sin(angle) + this.yOrigNormal;
                }

                var angle_in_radius = Math.atan2(this.coordNormal.y - this.yOrigNormal, this.coordNormal.x - this.xOrigNormal);
                // if (Math.sign(angle_in_degrees) == -1) {
                //     angle_in_degrees = Math.round(-angle_in_degrees * 180 / Math.PI);
                // } else {
                //     angle_in_degrees = Math.round(360 - angle_in_degrees * 180 / Math.PI);
                // }
                console.log("Angle: ", angle_in_radius)

                if (angle_in_radius > -0.76 && angle_in_radius < 0.76) {
                    // Move right
                    this.handleNormal.style.top = 75;
                    this.handleNormal.style.left = 150;
                    this.command = "moveRight"
                }
                else if (angle_in_radius > 0.76 && angle_in_radius < 2.25) {
                    // Go back
                    this.handleNormal.style.top = 150;
                    this.handleNormal.style.left = 75;
                    this.command = "backward"
                }
                else if (angle_in_radius > -2.25 && angle_in_radius < -0.76) {
                    // Go forward
                    this.handleNormal.style.top = 0;
                    this.handleNormal.style.left = 75;
                    this.command = "forward"
                }
                else {
                    // Move left
                    this.handleNormal.style.top = 75;
                    this.handleNormal.style.left = 0;
                    this.command = "moveLeft"
                }

                if (this.command != this.oldCommand) {
                    this.oldCommand = this.command
                    this.sendMove(this.command);
                }
            }
        },

        startDrawingLimited(event) {
            this.paintLimited = true;
            this.DrawLimited(event); // Cập nhật ngay khi bắt đầu
        },

        stopDrawingLimited() {
            this.paintLimited = false;
            this.handleLimited.style.top = `${this.yOrigLimited - 25}px`;
            this.handleLimited.style.left = `${this.xOrigLimited - 25}px`;
            this.sendRotate("Stop")
            //this.send(0, 0, 0, 0); // Reset send
        },

        DrawLimited(event) {
            if (this.paintLimited) {
                var mouse_x = event.clientX || event.touches[0].clientX;
                var mouse_y = event.clientY || event.touches[0].clientY;
                this.coordLimited.x = mouse_x - this.joystickLimited.offsetLeft;
                this.coordLimited.y = mouse_y - this.joystickLimited.offsetTop;

                // Tính toán khoảng cách từ tâm
                let distance = Math.sqrt(Math.pow(this.coordLimited.x - this.xOrigLimited, 2) + Math.pow(this.coordLimited.y - this.yOrigLimited, 2));

                if (distance > this.radiusLimited) {
                    // Tính toán lại vị trí trên vành dựa trên góc mới
                    let angle = Math.atan2(this.coordLimited.y - this.yOrigLimited, this.coordLimited.x - this.xOrigLimited);
                    this.coordLimited.x = this.radiusLimited * Math.cos(angle) + this.xOrigLimited;
                    this.coordLimited.y = this.radiusLimited * Math.sin(angle) + this.yOrigLimited;
                }

                // this.handleLimited.style.top = `${this.coordLimited.y - 25}px`;
                // this.handleLimited.style.left = `${this.coordLimited.x - 25}px`;

                var angle_in_radius = Math.atan2(this.coordLimited.y - this.yOrigLimited, this.coordLimited.x - this.xOrigLimited);
                
                if (angle_in_radius > -0.76 && angle_in_radius < 0.76) {
                    // Turn right
                    this.handleLimited.style.top = 75;
                    this.handleLimited.style.left = 150;
                    this.command = "turnRight"
                    // console.log("Turn right .............")
                }
                else if (angle_in_radius > 0.76 && angle_in_radius < 2.25) {
                    // Bow down
                    this.handleLimited.style.top = 150;
                    this.handleLimited.style.left = 75;
                    this.command = "bowDown"
                }
                else if (angle_in_radius > -2.25 && angle_in_radius < -0.76) {
                    // Look up
                    this.handleLimited.style.top = 0;
                    this.handleLimited.style.left = 75;
                    this.command = "lookUp"
                    // console.log("Look up .............")
                }
                else {
                    // Turn left
                    this.handleLimited.style.top = 75;
                    this.handleLimited.style.left = 0;
                    this.command = "turnLeft"
                }

                if (this.command != this.oldCommand) {
                    this.oldCommand = this.command
                    this.sendRotate(this.command);
                }
            }
        },

        sendMove(command) {
            if (command == 'forward')  {
                this.forward()
            }
            else if (command == 'backward') {
                this.backward()
            }
            else if (command == 'moveLeft') {
                this.moveLeft()
            }
            else if (command == 'moveRight') {
                this.moveRight()
            }
            else {
                this.stop()
            }
        },

        sendRotate(command) {
            if (command == 'lookUp')  {
                this.lookUp()
            }
            else if (command == 'bowDown') {
                this.bowDown()
            }
            else if (command == 'turnLeft') {
                this.turnLeft()
            }
            else if (command == 'turnRight') {
                this.turnRight()
            }
            else {
                this.stop()
            }
        },

        updateSliderValue(sliderName) {
            
            // Thực hiện các hành động khác nếu cần
            // if (sliderName == "LowHue") {
            //     if (this.LowHue > this.HighHue) {
            //         this.LowHue = this.HighHue
            //     }
            // } else if (sliderName == "LowSaturation") {
            //     if (this.LowSaturation > this.HighSaturation) {
            //         this.LowSaturation = this.HighSaturation
            //     }
            // } else if (sliderName == "LowValue") {
            //     if (this.LowValue > this.HighValue) {
            //         this.LowValue = this.HighValue
            //     }
            // } else if (sliderName == "HighHue") {
            //     if (this.HighHue < this.LowHue) {
            //         this.HighHue = this.LowHue
            //     }
            // } else if (sliderName == "HighSaturation") {
            //     if (this.HighSaturation < this.LowSaturation) {
            //         this.HighSaturation = this.LowSaturation
            //     }
            // } else if (sliderName == "HighValue") {
            //     if (this.HighValue < this.LowValue) {
            //         this.HighValue = this.LowValue
            //     }
            // }

            console.log(`${sliderName} has been updated to: ${this[sliderName]}`);
        }

    }
})

app.mount('#app');
}