function navInit() {
  const { createApp } = Vue;
  
  const app = createApp({
      data() {
          return {
            connected: JSON.parse(localStorage.getItem('connected')) || false,
            ros: JSON.parse(localStorage.getItem('ros')) || "abc",
            ros2: null,
            // ros: null,
            logs: JSON.parse(localStorage.getItem('logs')) || [],
            topic: null,
            message: null,
            // VMWARE
            ws_address: localStorage.getItem('ws_address') || 'ws://192.168.1.129:9090',
            // ROBOT
            ws_address2: localStorage.getItem('ws_address') || 'ws://192.168.1.221:9090',
            voiceOn: true,
            connectedMap: false,

            occupancyGrid: null,
            mapTopic: null,
            poseTopic: null,
            saveMapTopic: null,
            viewer: null,
            gridClient: null,

            pose: null,
            canvas: null,
            context: null,
            imageData: null,

            viewerHeight: 600,
            viewerWidth: 800,

            width: null,
            height: null,
            scaleX: null,
            scaleY: null,
            bitmap: null,

            mapPositionX: null,
            mapPositionY: null,
            robotPositionX: null,
            robotPositionY: null,
            mapResolution: null,
            robotX: null,
            robotY: null,

            canvasElement: null,
            goalTopic: null,

            cameraTopic: null,
            notifyGamepadControlTopic: null,

            mapName: "myMap" 
          };
      },
      methods: {
        connect2() {
          this.ros = new ROSLIB.Ros({
              url: this.ws_address
          });
          this.ros2 = new ROSLIB.Ros({
            url: this.ws_address2
          });

          this.ros.on('connection', () => {
            this.connected = true;
            this.logs.unshift('Connected to websocket server.');
            // this.saveState();
          });

          this.ros2.on('connection', () => {
            // this.connected = true;
            this.logs.unshift('Connected to map server.');
          });

          this.ros.on('error', (error) => {
              this.connected = false;
              this.logs.unshift('Error connecting to websocket server: ', error);
              console.log("Error occur")
              // this.saveState();
          });

          this.ros.on('close', () => {
              this.connected = false;
              this.logs.unshift('Connection to websocket server closed.');
              console.log("Error close")
              // this.saveState();
          });
          this.connected=true;
          console.log("Connect")
          
          this.initNav()
        },
        disconnect() {
            if (this.ros) {
                this.ros.close();
                this.connected = false;
                
                // window.location.href = 'startPage.html';
            }
            if (this.ros2) {
              this.ros2.close();
              this.connected = false;
              
              // window.location.href = 'startPage.html';
          }
        },
        initNav() {
            this.cameraTopic = new ROSLIB.Topic({
              ros: this.ros2,
              name: '/camera/image_raw/compressed', // Tên topic mà camera phát
              messageType: 'sensor_msgs/msg/CompressedImage'
            });

            this.notifyGamepadControlTopic = new ROSLIB.Topic({
              ros: this.ros2,
              name: 'notifyGamepadControl', // Tên topic để thông báo cho robot biết chuyển qua control by gamnepad
              messageType: 'std_msgs/String'
            });
            this.onNotifyGamepadControlTopic();

            /* 
            Topic connect to VMware to get map, pose for navigation
            */
            this.mapTopic = new ROSLIB.Topic({
                ros: this.ros,
                name: 'map_json', // Tên topic mà camera phát
                messageType: 'std_msgs/String'
            });
            this.poseTopic = new ROSLIB.Topic({
              ros: this.ros,
              name: 'pose', // Tên topic mà camera phát
              messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped'
            });
            this.goalTopic = new ROSLIB.Topic({
              ros: this.ros,
              name: '/goal_pose', // Tên topic mà camera phát
              messageType: 'geometry_msgs/PoseStamped'
            });

            this.saveMapTopic = new ROSLIB.Topic({
              ros: this.ros,
              name: 'saveMap', // Tên topic mà camera phát
              messageType: 'std_msgs/String'
            });

            this.cameraTopic.subscribe((message) => {
                const img = new Image();
                img.src = 'data:image/jpeg;base64,' + message.data; // Chuyển đổi dữ liệu thành base64
                document.getElementById('camera-view-navigation').innerHTML = ''; // Xóa ndung cũ
                document.getElementById('camera-view-navigation').appendChild(img); // Thêm hình ảnh mớiội 
            });
            
            this.poseTopic.subscribe((message) => { 
              console.log("Pose.......")
              if (!message) {
                console.log("Invalid message or message structure is incorrect");
                return; // Nếu không hợp lệ, thoát ra
              }
              else if (!message.pose) {
                console.log("Invalid message pose");
              }
              else if (!message.pose.pose.position) {
                console.log("Invalid message pose position");
              }
          
              console.log("pose message: ", message)
              this.robotPositionX = message.pose.pose.position.x
              this.robotPositionY = message.pose.pose.position.y
            });
            
            this.mapTopic.subscribe((message) => {
              const now = new Date().getTime() / 1000; // Lấy thời gian hiện tại (giây)
              if (this.lastSecond === null || now - this.lastSecond >= 1) {
                this.messageCount = 1; // Reset đếm nếu đã qua 1 giây
                this.lastSecond = now;
              } else {
                this.messageCount++; // Tăng số tin nhắn nếu vẫn trong cùng 1 giây
              }

              console.log("OccupanccyGrid: ")
              this.occupancyGrid = JSON.parse(message.data)
              console.log("OccupanccyGrid: ", this.occupancyGrid)
              
              this.mapPositionX = this.occupancyGrid.info.origin.position.x
              this.mapPositionY = this.occupancyGrid.info.origin.position.y
              this.mapResolution = this.occupancyGrid.info.resolution
              // var message = JSON.parse(message.data);

              // internal drawing canvas
              this.canvas = document.getElementById('myCanvas');
              
              this.context = this.canvas.getContext('2d');

              // set the size
              this.width = this.occupancyGrid.info.width;
              this.height = this.occupancyGrid.info.height;

              // if (this.width < this.viewerWidth) {
              //   this.canvas.width = this.viewerHeight
              // } else 
              this.canvas.width = this.width;
              this.canvas.height = this.height;

              
              // this.canvas.height = this.viewerWidth

              // this.viewer.width = this.width;
              // this.viewer.height = this.height;

              this.imageData = this.context.createImageData(this.width, this.height);
              for ( var row = 0; row < this.height; row++) {
                for ( var col = 0; col < this.width; col++) {
                  // determine the index into the map data
                  var mapI = col + ((this.height - row - 1) * this.width);
                  // determine the value
                  var data = this.occupancyGrid.data[mapI];
                  var val;
                  // -1 = unknown
                  // 0  = free
                  // 100 = occupied
                  if (data === -1) {
                    val = 127;
                  } else if (data === 0) {
                    val = 255;
                  } else {
                    val = 0;
                  }

                  // determine the index into the image data array
                  var i = (col + (row * this.width)) * 4;
                  // r
                  this.imageData.data[i] = val;
                  // g
                  this.imageData.data[++i] = val;
                  // b
                  this.imageData.data[++i] = val;
                  // a
                  this.imageData.data[++i] = 255;
                }
              }
              
              /////////////////////////////////
              this.scaleX = Math.floor(this.viewerWidth/this.width);
              this.scaleY = Math.floor(this.viewerHeight/this.height);
              this.scaleX = Math.max(this.scaleX, this.scaleY)
              this.scaleY = this.scaleX
              console.log("scaleX: ", this.scaleX)
              console.log("scaleY: ", this.scaleY)

              var newWidth = this.width * this.scaleX;
              var newHeight = this.height * this.scaleY;
              var newImageData = this.context.createImageData(newWidth, newHeight);
              this.canvas.width = newWidth;
              this.canvas.height = newHeight;
              // Sao chép pixel từ imageData ban đầu sang imageData mới
              for (var row = 0; row < this.height; row++) {
                for (var col = 0; col < this.width; col++) {
                  // Tính toán index vào dữ liệu hình ảnh ban đầu
                  var i = (col + (row * this.width)) * 4;
                  
                  // Tính toán giá trị pixel
                  var r = this.imageData.data[i];
                  var g = this.imageData.data[i + 1];
                  var b = this.imageData.data[i + 2];
                  var a = this.imageData.data[i + 3];

                  // Sao chép pixel sang vị trí mới với kích thước gấp đôi
                  for (var newRow = 0; newRow < this.scaleX; newRow++) {
                    for (var newCol = 0; newCol < this.scaleY; newCol++) {
                      var newIndex = ((col * this.scaleX + newCol) + ((row * this.scaleY + newRow) * newWidth)) * 4;
                      newImageData.data[newIndex] = r;
                      newImageData.data[newIndex + 1] = g;
                      newImageData.data[newIndex + 2] = b;
                      newImageData.data[newIndex + 3] = a;
                    }
                  }
                }
              }

              // Thay thế imageData ban đầu bằng imageData mới
              this.imageData = newImageData;

              ////////////////////////////////
              this.context.putImageData(this.imageData, 0, 0);
              this.bitmap = new createjs.Bitmap(this.canvas);
      
              // Change Y direction
              // this.bitmap.y = 0;

              // Set the pose
              // this.bitmap.x = 0;

              this.robotX = Math.abs(Math.round((this.mapPositionX - this.robotPositionX)/this.mapResolution))
              this.robotY = Math.abs(Math.round((this.mapPositionY - this.robotPositionY)/this.mapResolution))
              console.log("mapPositionX: ", this.mapPositionX)
              console.log("mapPositionY: ", this.mapPositionY)
              console.log("mapResolution: ", this.mapResolution)
              console.log("positionX: ", this.robotX * this.scaleX)
              console.log("positionY: ", this.robotY)
              console.log("Y convert: ", this.height - this.robotY)

              console.log("pose messageX: ", this.robotPositionX)
              console.log("pose messageY: ", this.robotPositionY)

              // Draw the robot position
              this.context.beginPath();
              // this.context.arc(100, 100, 10, 0, Math.PI * 2); // Vẽ hình tròn
              this.context.arc(this.robotX * this.scaleX, this.height * this.scaleY - this.robotY * this.scaleY, 1*this.scaleX, 0, Math.PI * 2);
              this.context.fillStyle = "red"; // Màu đỏ
              this.context.fill();
              this.context.closePath();

              console.log("Connect to grid", this.bitmap)
            });
          },
          eventCanvas() {
            // this.canvasEvent = document.getElementById('myCanvas');
            console.log("canvas object: ", this.canvas)
            this.canvas.addEventListener("click", this.onClick, false);
          },  
          onClick(e) {
              const mouseX = e.clientX; // Tọa độ X
              const mouseY = e.clientY; // Tọa độ Y
              
              // Để tính toán tọa độ tương đối trên canvas
              const canvasRect = this.canvas.getBoundingClientRect();
              const relativeX = mouseX - canvasRect.left; // Tọa độ X tương đối
              const relativeY = mouseY - canvasRect.top;  // Tọa độ Y tương đối

              alert(`Event clicked at (${relativeX}, ${relativeY})`); // Hiển thị tọa độ nhấp
              console.log(`Event clicked at (${relativeX}, ${relativeY})`); // Ghi lại tọa độ trong console

              var resultX = 0
              var resultY = 0

              var poseX = relativeX/ this.scaleX * this.mapResolution + this.mapPositionX
              resultX = poseX
              var poseY = (this.height - relativeY/ this.scaleX) * this.mapResolution + this.mapPositionY
              resultY = poseY
                
              console.log("robotX = ", this.robotPositionX)
              console.log("robotY = ", this.robotPositionY)
              console.log("poseX = ", resultX)
              console.log("poseY = ", resultY)

              const poseWithCovarianceStamped = new ROSLIB.Message({
                header: {
                    stamp: { secs: Math.floor(Date.now() / 1000), nsecs: 0 }, // Thời gian (epoch)
                    frame_id: 'map'          // Khung tọa độ mà thông điệp thuộc về
                },
                pose: {
                        position: {
                            x: resultX,          // Thay đổi tọa độ x theo yêu cầu
                            y: resultY,          // Thay đổi tọa độ y theo yêu cầu
                            z: 0.0           // Thay đổi tọa độ z nếu cần
                        },
                        orientation: {
                            x: 0.0,          // Thành phần x của quaternion
                            y: 0.0,          // Thành phần y của quaternion
                            z: 0.0,          // Thành phần z của quaternion
                            w: 1.0           // Thành phần w của quaternion
                        }
                }
            });
            this.goalTopic.publish(poseWithCovarianceStamped)
          },
          saveMap(){
            const saveMap = {
              data: this.mapName  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
            };
            this.saveMapTopic.publish(saveMap)
            console.log("Save map success!!!")
            alert("Save map success!!!")
          },

          onNotifyGamepadControlTopic() {
            const notifyGamepadControlMsg = {
              data: "on"  // Notify for robot to control by gamepad
            };
            this.notifyGamepadControlTopic.publish(notifyGamepadControlMsg)
          },

          offNotifyGamepadControlTopic() {
            const notifyGamepadControlMsg = {
              data: "off"  // Notify for robot to control by gamepad
            };
            this.notifyGamepadControlTopic.publish(notifyGamepadControlMsg)
          },
    }
  })
  
  app.mount('#navApp');
  }