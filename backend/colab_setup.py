# ======================================================================
# Spider's VIDEO RECAPPPER 3.0 COLAB SETUP
# ======================================================================

# ၁။ အဟောင်းတွေ အကုန်ရှင်းမယ်
!pkill -f lt
!pkill -f uvicorn
!pkill -f cloudflared

# ၂။ System Dependencies
!apt-get update -y
!apt-get install -y ffmpeg libraqm-dev

# ၃။ GitHub ကနေ Code အသစ်ယူမယ်
import os
%cd /content
if os.path.exists('/content/video_recapper'):
    !rm -rf /content/video_recapper
!git clone https://github.com/ayeminaung010/video_recapper.git
%cd /content/video_recapper

# ၄။ Libraries သွင်းမယ်
!pip install -q fastapi uvicorn moviepy pydantic python-multipart faster-whisper torch yt-dlp

# ၅။ Cloudflared Binary ကို ယူမယ်
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
!chmod +x cloudflared

# ၆။ Backend ကို Background မှာ run မယ်
import threading
import time
import subprocess
import re

def run_app():
    # Set Environment Variables for proper imports and fonts
    os.environ['PYTHONPATH'] = '/content/video_recapper'
    os.environ['CAPTION_FONT_PATH'] = '/content/video_recapper/backend/font/Pyidaungsu.ttf'
    
    # Run from root so 'backend.main' works
    !uvicorn backend.main:app --host 0.0.0.0 --port 8000

threading.Thread(target=run_app, daemon=True).start()
print("\n🚀 Video Recapper Backend စတင်နေပါပြီ... ခဏစောင့်ပေးပါ...")
time.sleep(15)

# ၇။ NO PASSWORD Link ကို ထုတ်ပေးမယ်
print("\n" + "="*60)
print("🕸️ Spider ရဲ့ CLOUDFLARE TUNNEL ကို ချိတ်ဆက်နေပါတယ်...")
print("="*60)

proc = subprocess.Popen(['./cloudflared', 'tunnel', '--url', 'http://127.0.0.1:8000'], 
                        stderr=subprocess.PIPE, 
                        text=True)

api_url = None
for i in range(120):
    line = proc.stderr.readline()
    if "trycloudflare.com" in line:
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare.com", line)
        if match:
            api_url = match.group(0)
            break
    time.sleep(0.5)

if api_url:
    print(f"\n✅ SUCCESS! Video Recapper အဆင်သင့်ဖြစ်ပါပြီ Boss!")
    print(f"🔗 API URL: {api_url}")
    print("ဒီ link ကို ယူသုံးပါ၊ ဘာ password မှ မလိုပါဘူး။")
    print("="*60)
else:
    print("\n⚠️ Link ထွက်မလာသေးဘူး Boss၊ Cell ကို နောက်တစ်ခေါက် ပြန် run ကြည့်ပေးပါ။")
