# 📦 الاستيرادات
from flask import Flask
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
import cv2
import base64
import time
import eventlet
import random
import numpy as np  # 🔥 إضافة مكتبة Numpy لإنشاء الخريطة الحرارية

eventlet.monkey_patch()

# 🏢 تهيئة التطبيق
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
model = YOLO('yolov8n.pt')
camera = cv2.VideoCapture(0)

# 📄 صفحة فحص
@app.route('/')
def index():
    return "Drone Camera Server Running..."

# 📸 دالة التقاط الإطارات
def generate_frames():
    while True:
        success, frame = camera.read()
        if not success:
            break

        results = model(frame)
        annotated_frame = results[0].plot()

        _, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        # 📈 تجهيز بيانات الاكتشاف
        detections = []
        points = []  # نقاط المراكز لإنشاء الخريطة الحرارية

        for result in results:
            boxes = result.boxes.xyxy.cpu().numpy().tolist()
            confidences = result.boxes.conf.cpu().numpy().tolist()
            classes = result.boxes.cls.cpu().numpy().tolist()
            detections.append({
                'boxes': boxes,
                'confidences': confidences,
                'classes': classes
            })

            # احسب مركز كل بوكس
            for box in boxes:
                x1, y1, x2, y2 = box
                center_x = int((x1 + x2) / 2)
                center_y = int((y1 + y2) / 2)
                points.append((center_x, center_y))

        # 🌍 إضافة بيانات GPS وهمية
        gps_data = {
            'latitude': 24.7136 + random.uniform(-0.001, 0.001),
            'longitude': 46.6753 + random.uniform(-0.001, 0.001)
        }

        # 🔥 إنشاء Heatmap
        heatmap = np.zeros((frame.shape[0], frame.shape[1]), dtype=np.uint8)

        for (x, y) in points:
            cv2.circle(heatmap, (x, y), radius=50, color=255, thickness=-1)

        heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

        # 🔥 دمج الـ heatmap فوق الصورة الأصلية بشفافية
        combined = cv2.addWeighted(frame, 0.6, heatmap_color, 0.4, 0)

        # 🔥 تحويل الخريطة الحرارية إلى Base64
        _, heatmap_buffer = cv2.imencode('.jpg', combined)
        heatmap_base64 = base64.b64encode(heatmap_buffer).decode('utf-8')

        # 🚀 إرسال كل البيانات إلى الفرونت
        socketio.emit('detections', {
            'annotated_image': f"data:image/jpeg;base64,{frame_base64}",
            'heatmap_image': f"data:image/jpeg;base64,{heatmap_base64}",
            'detections': detections,
            'gps': gps_data
        })

        time.sleep(0.6)

# 🔌 حدث الاتصال
@socketio.on('connect')
def handle_connect():
    print('✅ Client connected!')

# 🚀 تشغيل السيرفر
if __name__ == '__main__':
    socketio.start_background_task(target=generate_frames)
    socketio.run(app, host='0.0.0.0', port=5005)
