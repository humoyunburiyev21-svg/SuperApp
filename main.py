from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import qrcode
import os
import uuid
import google.generativeai as genai
from PIL import Image
import io

app = FastAPI()

# ---------------------------------------------------------
# API KALIT (Xavfsizlik uchun .env fayl ishlatsangiz maqsadga muvofiq bo'ladi)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# ---------------------------------------------------------

# Gemini sozlamalari
try:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash') 
    ai_active = True
except:
    ai_active = False

# Papkalar ochish
for folder in ["qrcodes", "converted"]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/qrcodes", StaticFiles(directory="qrcodes"), name="qrcodes")
app.mount("/converted", StaticFiles(directory="converted"), name="converted")

class AIRequest(BaseModel):
    prompt: str

@app.get("/")
async def read_root():
    return FileResponse('static/index.html')

# --- 1. QR KOD APISI ---
@app.post("/api/generate-qr")
async def generate_qr(request: Request):
    data = await request.json()
    text = data.get("text")
    if not text: return {"error": "Matn yo'q"}
    
    # Oddiy
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(text)
    qr.make(fit=True)
    img_s = qr.make_image(fill_color="black", back_color="white")
    name_s = f"qr_simple_{uuid.uuid4()}.png"
    img_s.save(f"qrcodes/{name_s}")

    # Zamonaviy
    qr2 = qrcode.QRCode(box_size=10, border=4)
    qr2.add_data(text)
    qr2.make(fit=True)
    img_m = qr2.make_image(fill_color="#2563eb", back_color="white")
    name_m = f"qr_modern_{uuid.uuid4()}.png"
    img_m.save(f"qrcodes/{name_m}")
    
    return {"url_simple": f"/qrcodes/{name_s}", "url_modern": f"/qrcodes/{name_m}"}

# --- 2. AI CHAT APISI (Dublikat olib tashlandi) ---
@app.post("/api/chat")
async def chat_with_ai(request: AIRequest):
    if not ai_active: return {"response": "API kalit xato!"}
    try:
        response = model.generate_content(request.prompt)
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Xatolik: {str(e)}"}

# --- 3. AI VISION (RASM + MATN) ---
@app.post("/api/chat-with-image")
async def chat_with_image(prompt: str = Form(...), file: UploadFile = File(...)):
    if not ai_active: return {"response": "API kalit xato!"}
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        response = model.generate_content([prompt, image])
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Xatolik: {str(e)}"}

# --- 4. RASM KONVERTER APISI ---
@app.post("/api/convert")
async def convert_image(file: UploadFile = File(...), format: str = Form(...)):
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        filename = f"img_{uuid.uuid4()}.{format.lower()}"
        save_path = f"converted/{filename}"
        
        image.save(save_path, format.upper())
        
        return {"url": f"/converted/{filename}"}
    except Exception as e:
        return {"error": str(e)}