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
              ws_address: localStorage.getItem('ws_address') || 'ws://192.168.1.229:9090',
              // ROBOT
              ws_address2: localStorage.getItem('ws_address') || 'ws://192.168.1.221:9090',
              voiceOn: true,
              connectedMap: false,

              occupancyGrid: null,
              mapTopic: null,
              poseTopic: null,
              viewer: null,
              gridClient: null,

              pose: null,
              canvas: null,
              context: null,
              imageData: null,

              viewerHeight: 300,
              viewerWidth: 500,
              scaleWidth: 1,
              scaleHeight: 1,

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
              goalPose: "\n X: undefined  \n Y: undefined ",

              canvasElement: null,
              goalTopic: null,

              cameraTopic: null
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
          },
          initNav() {
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
              this.cameraTopic = new ROSLIB.Topic({
                ros: this.ros2,
                name: '/camera/image_raw/compressed', // Tên topic mà camera phát
                messageType: 'sensor_msgs/msg/CompressedImage'
              });
              this.saveMap = new ROSLIB.Topic({
                ros: this.ros,
                name: 'saveMap', // Tên topic mà camera phát
                messageType: 'std_msgs/String'
              });

              this.cameraTopic.subscribe((message) => {
                const img = new Image();
                // console.log("Image received !")
                img.src = 'data:image/jpeg;base64,' + message.data; // Chuyển đổi dữ liệu thành base64
                document.getElementById('camera-view-navigation').innerHTML = ''; // Xóa nội dung cũ
                document.getElementById('camera-view-navigation').appendChild(img); // Thêm hình ảnh mới
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

                if (this.width < this.viewerWidth || this.height < this.viewerHeight) {
                  // If the map generate is small then scale up it.
                  if (this.width < this.viewerWidth) {
                    this.scaleWidth = this.width / this.viewerWidth
                  }
  
                  if (this.height < this.viewerHeight) {
                    this.scaleHeight = this.height / this.viewerHeight
                  }
                  
                  this.imageData = this.context.createImageData(this.viewerWidth, this.viewerHeight);

                  for ( var row = 0; row < this.viewerHeight; row++) {
                    for ( var col = 0; col < this.viewerWidth; col++) {
                      // Map scaled coordinates back to original coordinates
                      const origX = Math.floor(col * this.scaleWidth);
                      const origY = Math.floor((this.viewerHeight - row - 1) * this.scaleY);
                      const mapIndex = origX + origY * this.width;

                      // Get occupancy value
                      const value = this.occupancyGrid.data[mapIndex];

                      // Determine RGBA color based on occupancy value
                      let r, g, b, a;
                      if (value === 100) { // Occupied
                          r = g = b = 0; a = 255;
                      } else if (value === 0) { // Free space
                          r = g = b = 255; a = 255;
                      } else { // Unknown (-1)
                          r = g = b = 128; a = 255;
                      }

                      // Set pixel data in ImageData (RGBA order)
                      const pixelIndex = (col + row * this.viewerWidth) * 4;
                      this.imageData.data[pixelIndex] = r;
                      this.imageData.data[pixelIndex + 1] = g;
                      this.imageData.data[pixelIndex + 2] = b;
                      this.imageData.data[pixelIndex + 3] = a;
                    }
                  }
                }
                else {
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
                }
                
                this.context.putImageData(this.imageData, 0, 0);
                this.bitmap = new createjs.Bitmap(this.canvas);
        
                // Change Y direction
                this.bitmap.y = -300;

                // console.log("y position: ", this.bitmap.y)
                // Scale the image
                this.bitmap.scaleX = this.viewerWidth/this.width;
                this.bitmap.scaleY = this.viewerHeight/this.height; 

                // Set the pose
                this.bitmap.x = 0;

                this.robotX = Math.abs(Math.round((this.mapPositionX - this.robotPositionX)/this.mapResolution))
                this.robotY = Math.abs(Math.round((this.mapPositionY - this.robotPositionY)/this.mapResolution))
                console.log("mapPositionX: ", this.mapPositionX)
                console.log("mapPositionY: ", this.mapPositionY)
                console.log("mapResolution: ", this.mapResolution)
                console.log("positionX: ", this.robotX)
                console.log("positionY: ", this.robotY)
                console.log("Y convert: ", this.height - this.robotY)

                console.log("pose messageX: ", this.robotPositionX)
                console.log("pose messageY: ", this.robotPositionY)

                // Draw the robot position
                this.context.beginPath();
                // this.context.arc(this.robotX, this.robotY, 10, 0, Math.PI * 2); // Vẽ hình tròn
                this.context.arc(this.robotX, this.height - this.robotY, 5, 0, Math.PI * 2);
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
                this.scaleWidth = 1
                this.scaleHeight = 1

                if (this.width < this.viewerWidth || this.height < this.viewerHeight) {
                  // If the map generate is small then scale up it.
                  if (this.width < this.viewerWidth) {
                    this.scaleWidth = this.width / this.viewerWidth
                  }

                  if (this.height < this.viewerHeight) {
                    this.scaleHeight = this.height / this.viewerHeight
                  }
                }

                var poseX = relativeX * this.mapResolution + this.mapPositionX
                resultX = poseX * this.scaleWidth
                var poseY = (this.height - relativeY) * this.mapResolution + this.mapPositionY
                resultY = poseY * this.scaleHeight
                  
                console.log("robotX = ", this.robotPositionX)
                console.log("robotY = ", this.robotPositionY)
                console.log("poseX = ", resultX)
                console.log("poseY = ", resultY)
                this.goalPose = "\n X: " + resultX + "\n Y: " + resultY

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

            SaveMap() {
              // Hiển thị hộp thoại nhập tên bản đồ
              const mapName = prompt("Nhập tên bản đồ của bạn:", "mymap");
          
              // Kiểm tra nếu người dùng không hủy và đã nhập tên
              if (mapName !== null && mapName.trim() !== "") {
                  console.log(`Tên bản đồ được lưu: ${mapName}`);
                  // Thực hiện logic lưu bản đồ với tên vừa nhập
                  const saveMapMesg = {
                
                    data: mapName,  // Định dạng lại tin nhắn theo kiểu JSON để bao gồm trường "data"
                  };
                  this.saveMap.publish(saveMapMesg)
              } else {
                  console.log("Người dùng đã hủy hoặc không nhập tên.");
              }
          }

      }
    })
    
    app.mount('#navApp');
    }