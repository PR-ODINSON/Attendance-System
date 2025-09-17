# # import os
# # import cv2
# # import numpy as np
# # import torch
# # import requests
# # import time
# # import pandas as pd
# # from datetime import datetime
# # from facenet_pytorch import InceptionResnetV1, MTCNN
# # from sklearn.preprocessing import normalize

# # # ------------------- Configuration -------------------
# # UPLOADS_FOLDER = '../backend/uploads'  # Folder where embeddings are stored
# # API_URL = "http://localhost:3000/mark-attendance"
# # THRESHOLD = 0.65  # Cosine similarity threshold
# # # -----------------------------------------------------

# # # Initialize models
# # mtcnn = MTCNN(keep_all=True)
# # resnet = InceptionResnetV1(pretrained='vggface2').eval()

# # # ------------------- Functions -------------------

# # def detect_and_encode(image):
# #     with torch.no_grad():
# #         boxes, _ = mtcnn.detect(image)
# #         if boxes is not None:
# #             embeddings = []
# #             for box in boxes:
# #                 x1, y1, x2, y2 = map(int, box)
# #                 face = image[y1:y2, x1:x2]
# #                 if face.size == 0:
# #                     continue
# #                 face = cv2.resize(face, (160, 160))
# #                 face = np.transpose(face, (2, 0, 1)).astype(np.float32) / 255.0
# #                 face_tensor = torch.tensor(face).unsqueeze(0)
# #                 encoding = resnet(face_tensor).detach().numpy().flatten()
# #                 embedding = normalize([encoding])[0]
# #                 embeddings.append((embedding, box))
# #             return embeddings
# #     return []

# # def match_embedding(input_embedding):
# #     for person_folder in os.listdir(UPLOADS_FOLDER):
# #         full_path = os.path.join(UPLOADS_FOLDER, person_folder)
# #         csv_path = os.path.join(full_path, 'embeddings.csv')
# #         if not os.path.exists(csv_path):
# #             continue

# #         df = pd.read_csv(csv_path, header=None)
# #         for _, row in df.iterrows():
# #             known_embedding = row.values.astype(float)
# #             known_embedding = normalize([known_embedding])[0]
# #             similarity = np.dot(known_embedding, input_embedding)
# #             if similarity >= THRESHOLD:
# #                 return person_folder
# #     return "Unknown"

# # def mark_attendance(name):
# #     try:
# #         timestamp = datetime.now().isoformat()
# #         response = requests.post(API_URL, json={"name": name, "time": timestamp})
# #         if response.status_code == 200:
# #             print(f"✅ Marked attendance for {name}")
# #             return True
# #         else:
# #             print(f"⚠️ Failed to mark attendance for {name}: {response.status_code}")
# #     except Exception as e:
# #         print(f"❌ Error sending request for {name}: {e}")
# #     return False

# # # ------------------- Main -------------------

# # cap = cv2.VideoCapture(0)
# # marked_names = set()

# # print("🎥 Starting camera. Press 'q' to quit.")

# # while cap.isOpened():
# #     ret, frame = cap.read()
# #     if not ret:
# #         break

# #     rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
# #     embeddings_with_boxes = detect_and_encode(rgb_frame)

# #     for embedding, box in embeddings_with_boxes:
# #         name = match_embedding(embedding)

# #         x1, y1, x2, y2 = map(int, box)
# #         color = (0, 255, 0) if name != 'Unknown' else (0, 0, 255)
# #         cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
# #         cv2.putText(frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

# #         if name != "Unknown" and name not in marked_names:
# #             if mark_attendance(name):
# #                 marked_names.add(name)

# #     cv2.imshow("Face Recognition Attendance", frame)
# #     if cv2.waitKey(1) & 0xFF == ord('q'):
# #         break

# # cap.release()
# # cv2.destroyAllWindows()
# # print("📸 Camera stopped.")

# import os
# import cv2
# import numpy as np
# import torch
# import requests
# import time
# import pandas as pd
# from datetime import datetime
# from facenet_pytorch import InceptionResnetV1, MTCNN
# from sklearn.preprocessing import normalize
# from sklearn.neighbors import NearestNeighbors

# # ------------------- Configuration -------------------
# UPLOADS_FOLDER = '../backend/uploads'  # Folder where embeddings are stored
# API_URL = "http://localhost:3000/mark-attendance"
# THRESHOLD = 0.70  # Cosine similarity threshold
# # -----------------------------------------------------

# # Initialize models
# mtcnn = MTCNN(keep_all=True)
# resnet = InceptionResnetV1(pretrained='vggface2').eval()

# # ------------------- Preload embeddings and build LSH index -------------------

# all_embeddings = []
# all_names = []

# for person_folder in os.listdir(UPLOADS_FOLDER):
#     full_path = os.path.join(UPLOADS_FOLDER, person_folder)
#     csv_path = os.path.join(full_path, 'embeddings.csv')
#     if not os.path.exists(csv_path):
#         continue

#     df = pd.read_csv(csv_path, header=None)
#     for _, row in df.iterrows():
#         known_embedding = row.values.astype(float)
#         known_embedding = normalize([known_embedding])[0]
#         all_embeddings.append(known_embedding)
#         all_names.append(person_folder)

# # Build LSH index
# if all_embeddings:
#     neighbors_model = NearestNeighbors(n_neighbors=1, algorithm='auto', metric='cosine')
#     neighbors_model.fit(all_embeddings)
# else:
#     neighbors_model = None

# # ------------------- Functions -------------------

# def detect_and_encode(image):
#     with torch.no_grad():
#         boxes, _ = mtcnn.detect(image)
#         if boxes is not None:
#             embeddings = []
#             for box in boxes:
#                 x1, y1, x2, y2 = map(int, box)
#                 face = image[y1:y2, x1:x2]
#                 if face.size == 0:
#                     continue
#                 face = cv2.resize(face, (160, 160))
#                 face = np.transpose(face, (2, 0, 1)).astype(np.float32) / 255.0
#                 face_tensor = torch.tensor(face).unsqueeze(0)
#                 encoding = resnet(face_tensor).detach().numpy().flatten()
#                 embedding = normalize([encoding])[0]
#                 embeddings.append((embedding, box))
#             return embeddings
#     return []

# def match_embedding(input_embedding):
#     if neighbors_model is None:
#         return "Unknown"
#     input_embedding = np.array(input_embedding).reshape(1, -1)
#     distances, indices = neighbors_model.kneighbors(input_embedding)
#     if distances[0][0] <= (1 - THRESHOLD):  # cosine similarity threshold converted to distance
#         return all_names[indices[0][0]]
#     return "Unknown"

# def mark_attendance(name):
#     try:
#         timestamp = datetime.now().isoformat()
#         response = requests.post(API_URL, json={"name": name, "time": timestamp})
#         if response.status_code == 200:
#             print(f"✅ Marked attendance for {name}")
#             return True
#         else:
#             print(f"⚠️ Failed to mark attendance for {name}: {response.status_code}")
#     except Exception as e:
#         print(f"❌ Error sending request for {name}: {e}")
#     return False

# # ------------------- Main -------------------

# cap = cv2.VideoCapture(0)
# marked_names = set()

# print("🎥 Starting camera. Press 'q' to quit.")

# while cap.isOpened():
#     ret, frame = cap.read()
#     if not ret:
#         break

#     rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     embeddings_with_boxes = detect_and_encode(rgb_frame)

#     for embedding, box in embeddings_with_boxes:
#         name = match_embedding(embedding)

#         x1, y1, x2, y2 = map(int, box)
#         color = (0, 255, 0) if name != 'Unknown' else (0, 0, 255)
#         cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
#         cv2.putText(frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

#         if name != "Unknown" and name not in marked_names:
#             if mark_attendance(name):
#                 marked_names.add(name)

#     cv2.imshow("Face Recognition Attendance", frame)
#     if cv2.waitKey(1) & 0xFF == ord('q'):
#         break

# cap.release()
# cv2.destroyAllWindows()
# print("📸 Camera stopped.")
# New 1


# # This pc correct
# import os
# import cv2
# import numpy as np
# import torch
# import requests
# import pandas as pd
# import faiss
# import time
# from PIL import Image
# from datetime import datetime
# from facenet_pytorch import InceptionResnetV1, MTCNN
# from sklearn.preprocessing import normalize
# from predict import AntiSpoofPredict
# from utility import parse_model_name
# # ------------------- Configuration -------------------
# UPLOADS_FOLDER = '../backend/uploads'
# API_URL = "http://localhost:3000/api/attendance/mark-attendance" #change the url here http://localhost:3000/api/attendance/mark-attendance
# THRESHOLD = 0.75  # Cosine similarity threshold
# CACHE_TIMEOUT = 10  # seconds before re-marking same person
# # -----------------------------------------------------

# # Initialize models
# device = 'cuda' if torch.cuda.is_available() else 'cpu'
# mtcnn = MTCNN(keep_all=True, device=device)
# resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
# model_dir = './resources/anti_spoof_models'  # Adjust if needed
# anti_spoof = AntiSpoofPredict(device_id=0)



# # ------------------- Preload embeddings -------------------
# all_embeddings = []
# all_names = []

# for person_folder in os.listdir(UPLOADS_FOLDER):
#     full_path = os.path.join(UPLOADS_FOLDER, person_folder)
#     csv_path = os.path.join(full_path, 'embeddings.csv')
#     if not os.path.exists(csv_path):
#         continue

#     df = pd.read_csv(csv_path, header=None)
#     for _, row in df.iterrows():
#         known_embedding = row.values.astype(float)
#         known_embedding = normalize([known_embedding])[0]
#         all_embeddings.append(known_embedding)
#         all_names.append(person_folder)

# # Build FAISS index
# if all_embeddings:
#     d = len(all_embeddings[0])
#     index = faiss.IndexFlatIP(d)  # inner product = cosine similarity after normalization
#     all_embeddings = np.array(all_embeddings).astype('float32')
#     index.add(all_embeddings)
# else:
#     index = None

# # ------------------- Functions -------------------

# def detect_and_encode(image):
#     with torch.no_grad():
#         boxes, _ = mtcnn.detect(image)
#         if boxes is not None:
#             embeddings = []
#             for box in boxes:
#                 x1, y1, x2, y2 = map(int, box)
#                 face = image[y1:y2, x1:x2]
#                 if face.size == 0:
#                     continue
#                 face = cv2.resize(face, (160, 160))
#                 face = np.transpose(face, (2, 0, 1)).astype(np.float32) / 255.0
#                 face_tensor = torch.tensor(face).unsqueeze(0).to(device)
#                 encoding = resnet(face_tensor).cpu().detach().numpy().flatten()
#                 embedding = normalize([encoding])[0]
#                 embeddings.append((embedding, box))
#             return embeddings
#     return []

# def match_embedding(input_embedding):
#     if index is None:
#         return "Unknown", 0.0
#     input_embedding = np.array(input_embedding).astype('float32').reshape(1, -1)
#     similarity, idx = index.search(input_embedding, 1)
#     if similarity[0][0] >= THRESHOLD:
#         return all_names[idx[0][0]], similarity[0][0]
#     return "Unknown", similarity[0][0]

# def mark_attendance(name, recognition_time, time_taken_seconds):
#     try:
#         # timestamp = recognition_time.isoformat()
#         response = requests.post(API_URL, json={
#             "name": name,
#             # "time": timestamp,
#             "recognition_time_seconds": time_taken_seconds
#         })
#         print(response)
#         if response.status_code == 200:
#             print(f"Marked attendance for {name} : {time_taken_seconds:.2f}s)")
#             return True
#         else:
#             print(f"Failed to mark attendance for {name}: {response.status_code}")
#     except Exception as e:
#         print(f"Error sending request for {name}: {e}")
#     return False

# def is_real_face(frame, box, anti_spoof):
#     x1, y1, x2, y2 = map(int, box)
#     face_img = frame[y1:y2, x1:x2]
#     if face_img.size == 0:
#         return False

#     # Resize the face image to 80x80
#     face_img_resized = cv2.resize(face_img, (80, 80))  # Resize to 80x80

#     # Convert NumPy array to PIL image
#     face_img_rgb = cv2.cvtColor(face_img_resized, cv2.COLOR_BGR2RGB)
#     pil_image = Image.fromarray(face_img_rgb)

#     model_dir = "C:/Users/ayaan/OneDrive/Desktop/IITRAM/InSolare Project/AI Attendance System/flaskServer/Silent-Face-Anti-Spoofing/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth"
#     # print(f"Model path: {model_dir}")  # Print to check what model path is being used
#     prediction = anti_spoof.predict(pil_image, model_dir)

#     # prediction: [label, confidence]
#     label = np.argmax(prediction)  # 1 = real, 0 = spoof
#     return label == 1  # 1 = real, 0 = spoof



# # ------------------- Main -------------------

# cap = cv2.VideoCapture(0) # Use webcam
# # cap = cv2.VideoCapture("rtsp://admin:test@123@192.168.0.33:554/101?rtsp_transport=tcp", cv2.CAP_FFMPEG) #For CCTV camera

# # Reduce camera input buffer size to minimize lag
# cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

# # Track already marked people forever during this session
# marked_once = set()

# print("Starting camera. Press 'q' to quit.")

# while True:
#     # Flush old frames from buffer
#     for _ in range(4):  # Adjust depending on camera buffering
#         cap.grab()

#     ret, frame = cap.read()

#     # Reconnect if stream fails
#     if not ret or frame is None or np.mean(frame) < 10:
#         print("Skipped invalid or noisy frame. Reconnecting...")
#         cap.release()
#         time.sleep(1)
#         cap = cv2.VideoCapture("rtsp://admin:test@123@192.168.0.33:554/101")
#         cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
#         continue

#     # Optional: Resize frame for faster processing (uncomment if needed)
#     frame = cv2.resize(frame, (720, 720))

#     start_time = datetime.now()
#     rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     embeddings_with_boxes = detect_and_encode(rgb_frame)

#     for embedding, box in embeddings_with_boxes:
#         name, confidence = match_embedding(embedding)
#         x1, y1, x2, y2 = map(int, box)

#         # Spoof detection
#         if not is_real_face(frame, box, anti_spoof):
#             name = "Spoof Detected"
#             color = (0, 165, 255)
#         else:
#             color = (0, 255, 0) if name != 'Unknown' else (0, 0, 255)

#             if name != "Unknown" and name not in marked_once:
#                 recognition_end_time = datetime.now()
#                 time_taken_seconds = (recognition_end_time - start_time).total_seconds()

#                 if mark_attendance(name, recognition_end_time, time_taken_seconds):
#                     marked_once.add(name)

#         # Draw box
#         cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
#         cv2.putText(frame, f"{name} ({confidence:.2f})", (x1, y1 - 10),
#                     cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

#     cv2.imshow("Face Recognition Attendance - IP Camera", frame)
#     if cv2.waitKey(1) & 0xFF == ord('q'):
#         break

# cap.release()
# cv2.destroyAllWindows()
# print("IP Camera stream stopped.")



# New Code Improve it - Remove global marking and add attendance cooldown
import os
import cv2
import numpy as np
import torch
import requests
import pandas as pd
import faiss
import time
import threading
from PIL import Image
from datetime import datetime
from facenet_pytorch import InceptionResnetV1, MTCNN
from sklearn.preprocessing import normalize
from predict import AntiSpoofPredict
from utility import parse_model_name

# ------------------- Configuration -------------------
UPLOADS_FOLDER = '../backend/uploads'
API_URL = "http://localhost:3000/api/attendance/mark-attendance"
THRESHOLD = 0.75
RECONNECT_DELAY = 1.0
GRAB_FLUSH = 4
FRAME_SIZE = (720, 720)
MAX_RETRIES = 5
ATTENDANCE_COOLDOWN = 10 * 60  # 10 minutes in seconds
# -----------------------------------------------------

# ------------------- Device & Model Setup -------------------
device = 'cuda' if torch.cuda.is_available() else 'cpu'

def get_models():
    """Return a fresh set of models."""
    mtcnn = MTCNN(keep_all=True, device=device)
    resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
    anti_spoof = AntiSpoofPredict(device_id=0)
    return mtcnn, resnet, anti_spoof

# Shared models if CPU (to save memory)
if device == 'cpu':
    mtcnn, resnet, anti_spoof = get_models()
    resnet_lock = threading.Lock()
    antispoof_lock = threading.Lock()
else:
    mtcnn, resnet, anti_spoof = None, None, None
    resnet_lock = antispoof_lock = None

ANTI_SPOOF_MODEL_PATH = (
    "C:/Users/ayaan/OneDrive/Desktop/IITRAM/InSolare Project/AI Attendance System/"
    "flaskServer/Silent-Face-Anti-Spoofing/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth"
)

# ------------------- Preload Embeddings -------------------
all_embeddings, all_names = [], []
for person_folder in os.listdir(UPLOADS_FOLDER):
    full_path = os.path.join(UPLOADS_FOLDER, person_folder)
    csv_path = os.path.join(full_path, 'embeddings.csv')
    if not os.path.exists(csv_path):
        continue

    df = pd.read_csv(csv_path, header=None)
    for _, row in df.iterrows():
        known_embedding = row.values.astype(float)
        known_embedding = normalize([known_embedding])[0]
        all_embeddings.append(known_embedding)
        all_names.append(person_folder)

# Build FAISS index
if all_embeddings:
    d = len(all_embeddings[0])
    index = faiss.IndexFlatIP(d)
    all_embeddings = np.array(all_embeddings).astype('float32')
    index.add(all_embeddings)
else:
    index = None

# ------------------- Functions -------------------
def detect_and_encode(image, mtcnn_local, resnet_local, lock=None):
    with torch.no_grad():
        boxes, _ = mtcnn_local.detect(image)
    if boxes is not None:
        embeddings = []
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            face = image[y1:y2, x1:x2]
            if face.size == 0:
                continue
            face = cv2.resize(face, (160, 160))
            face = np.transpose(face, (2, 0, 1)).astype(np.float32) / 255.0
            face_tensor = torch.tensor(face).unsqueeze(0).to(device)
            with torch.no_grad():
                if lock:
                    with lock:
                        encoding = resnet_local(face_tensor).cpu().detach().numpy().flatten()
                else:
                    encoding = resnet_local(face_tensor).cpu().detach().numpy().flatten()
            embedding = normalize([encoding])[0]
            embeddings.append((embedding, box))
        return embeddings
    return []

def match_embedding(input_embedding):
    if index is None:
        return "Unknown", 0.0
    input_embedding = np.array(input_embedding).astype('float32').reshape(1, -1)
    similarity, idx = index.search(input_embedding, 1)
    if similarity[0][0] >= THRESHOLD:
        return all_names[idx[0][0]], similarity[0][0]
    return "Unknown", similarity[0][0]

def mark_attendance(name, recognition_time, time_taken_seconds):
    try:
        response = requests.post(API_URL, json={
            "name": name,
            "recognition_time_seconds": time_taken_seconds
        })
        if response.status_code == 200:
            print(f"[API] Marked attendance for {name} ({time_taken_seconds:.2f}s)")
            return True
        else:
            print(f"[API] Failed for {name}: {response.status_code}")
    except Exception as e:
        print(f"[API] Error for {name}: {e}")
    return False

def is_real_face(frame, box, anti_spoof_local, lock=None):
    x1, y1, x2, y2 = map(int, box)
    face_img = frame[y1:y2, x1:x2]
    if face_img.size == 0:
        return False
    face_img_resized = cv2.resize(face_img, (80, 80))
    face_img_rgb = cv2.cvtColor(face_img_resized, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(face_img_rgb)
    if lock:
        with lock:
            prediction = anti_spoof_local.predict(pil_image, ANTI_SPOOF_MODEL_PATH)
    else:
        prediction = anti_spoof_local.predict(pil_image, ANTI_SPOOF_MODEL_PATH)
    label = np.argmax(prediction)
    return label == 1

def should_mark(name, marked_dict):
    """Check if enough time has passed to re-mark attendance."""
    now = time.time()
    last_time = marked_dict.get(name, 0)
    if now - last_time >= ATTENDANCE_COOLDOWN:
        marked_dict[name] = now
        return True
    return False

# ------------------- Multi-Camera Worker -------------------
class CameraWorker(threading.Thread):
    def __init__(self, source, window_name, marked_dict, stop_event):
        super().__init__(daemon=True)
        self.source = source
        self.window_name = window_name
        self.marked_dict = marked_dict
        self.stop_event = stop_event
        self.cap = None

        # Per-camera models if GPU, shared if CPU
        if device == 'cuda':
            self.mtcnn, self.resnet, self.anti_spoof = get_models()
            self.resnet_lock = None
            self.antispoof_lock = None
        else:
            self.mtcnn, self.resnet, self.anti_spoof = mtcnn, resnet, anti_spoof
            self.resnet_lock = resnet_lock
            self.antispoof_lock = antispoof_lock

    def open_stream(self):
        tries = 0
        while tries < MAX_RETRIES:
            if isinstance(self.source, int):
                self.cap = cv2.VideoCapture(self.source, cv2.CAP_DSHOW)
            elif str(self.source).startswith("rtsp://"):
                self.cap = cv2.VideoCapture(f"{self.source}?rtsp_transport=tcp", cv2.CAP_FFMPEG)
            else:
                self.cap = cv2.VideoCapture(self.source)

            if self.cap.isOpened():
                return
            tries += 1
            print(f"[{self.window_name}] Failed to open {self.source}, retry {tries}/{MAX_RETRIES}")
            time.sleep(2)
        print(f"[{self.window_name}] Skipping (cannot open source).")
        self.cap = None

    def run(self):
        print(f"[{self.window_name}] Starting…")
        self.open_stream()
        if self.cap is None:
            return

        while not self.stop_event.is_set():
            for _ in range(GRAB_FLUSH):
                self.cap.grab()
            ret, frame = self.cap.read() if self.cap else (False, None)

            if not ret or frame is None or np.mean(frame) < 10:
                print(f"[{self.window_name}] Invalid/noisy frame. Reconnecting…")
                if self.cap:
                    self.cap.release()
                time.sleep(RECONNECT_DELAY)
                self.open_stream()
                continue

            frame = cv2.resize(frame, FRAME_SIZE)
            start_time = datetime.now()
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            embeddings_with_boxes = detect_and_encode(rgb_frame, self.mtcnn, self.resnet, self.resnet_lock)

            for embedding, box in embeddings_with_boxes:
                name, confidence = match_embedding(embedding)
                x1, y1, x2, y2 = map(int, box)

                if not is_real_face(frame, box, self.anti_spoof, self.antispoof_lock):
                    name = "Spoof Detected"
                    color = (0, 165, 255)
                else:
                    color = (0, 255, 0) if name != 'Unknown' else (0, 0, 255)
                    if name != "Unknown":
                        if should_mark(name, self.marked_dict):
                            recognition_end_time = datetime.now()
                            time_taken_seconds = (recognition_end_time - start_time).total_seconds()
                            if mark_attendance(name, recognition_end_time, time_taken_seconds):
                                print(f"[{self.window_name}] Attendance updated for {name}")

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{name} ({confidence:.2f})", (x1, max(20, y1 - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            cv2.imshow(self.window_name, frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.stop_event.set()
                break

        if self.cap:
            self.cap.release()
        cv2.destroyWindow(self.window_name)
        print(f"[{self.window_name}] Stopped.")

# ------------------- Main -------------------
if __name__ == "__main__":
    sources = [
        0,  # Laptop webcam
        # 1,  # USB webcam
        # 2,  # Another USB webcam
        # "rtsp://admin:test@192.168.0.33:554/101",
        # "http://192.168.0.50:8080/video",
    ]

    marked_dict = {}  # name -> last timestamp
    stop_event = threading.Event()
    workers = []

    for i, src in enumerate(sources, start=1):
        window_name = f"Camera {i}"
        worker = CameraWorker(src, window_name, marked_dict, stop_event)
        worker.start()
        workers.append(worker)

    print("Running multi-camera inference. Press 'q' in any window to quit.")

    try:
        while not stop_event.is_set():
            if cv2.waitKey(10) & 0xFF == ord('q'):
                stop_event.set()
                break
            time.sleep(0.05)
    finally:
        stop_event.set()
        for w in workers:
            w.join()
        cv2.destroyAllWindows()
        print("All camera streams stopped.")

