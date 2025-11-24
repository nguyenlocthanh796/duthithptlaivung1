# 🔧 Hướng Dẫn Cài Đặt Git Trên Windows

## ❌ **Lỗi: "git is not recognized"**

Lỗi này xảy ra khi Git chưa được cài đặt hoặc chưa được thêm vào PATH.

---

## 🚀 **Cách 1: Cài Đặt Git (Khuyến Nghị)**

### **Option A: Download Installer (Dễ nhất)** ⭐

1. **Download Git:**
   - Vào: https://git-scm.com/download/win
   - Click **"Download for Windows"**
   - File: `Git-2.x.x-64-bit.exe` (~50MB)

2. **Cài đặt:**
   - Chạy file `.exe` vừa download
   - Click **"Next"** qua các bước
   - **Quan trọng:** Chọn **"Git from the command line and also from 3rd-party software"**
   - Click **"Install"**
   - ⏳ Đợi 2-3 phút

3. **Kiểm tra:**
   ```powershell
   git --version
   ```
   Kết quả: `git version 2.x.x`

4. **Restart PowerShell/Terminal:**
   - Đóng và mở lại PowerShell
   - Hoặc restart máy tính

---

### **Option B: Dùng Winget (Windows 11/10)** ⭐

```powershell
# Cài đặt Git qua winget
winget install --id Git.Git -e --source winget

# Restart PowerShell sau khi cài
```

---

### **Option C: Dùng Chocolatey (Nếu đã có)**

```powershell
# Cài đặt Git qua Chocolatey
choco install git

# Restart PowerShell
```

---

## 🔧 **Cách 2: Thêm Git Vào PATH (Nếu đã cài nhưng không nhận)**

### **Kiểm tra Git đã cài chưa:**

```powershell
# Tìm Git installation
Get-ChildItem "C:\Program Files\Git\bin\git.exe" -ErrorAction SilentlyContinue
```

Nếu tìm thấy file, Git đã cài nhưng chưa có trong PATH.

### **Thêm vào PATH:**

1. **Mở System Properties:**
   - Nhấn `Win + R`
   - Gõ: `sysdm.cpl`
   - Enter

2. **Thêm PATH:**
   - Tab **"Advanced"**
   - Click **"Environment Variables"**
   - Trong **"System variables"**, tìm **"Path"**
   - Click **"Edit"**
   - Click **"New"**
   - Thêm: `C:\Program Files\Git\bin`
   - Click **"OK"** tất cả

3. **Restart PowerShell:**
   - Đóng và mở lại PowerShell
   - Test: `git --version`

---

## ✅ **Sau Khi Cài Git**

### **1. Cấu hình Git (Lần đầu):**

```powershell
# Set tên và email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Kiểm tra
git config --list
```

### **2. Kiểm tra Git hoạt động:**

```powershell
git --version
git status
```

---

## 🚀 **Tiếp Tục Setup Cloudflare Pages**

Sau khi cài Git xong, tiếp tục:

### **Bước 1: Khởi tạo Git repo (nếu chưa có)**

```powershell
cd D:\duthithptlaivung1
git init
git add .
git commit -m "Initial commit"
```

### **Bước 2: Tạo GitHub repo và push**

1. Vào: https://github.com/new
2. Tạo repo mới: `duthithptlaivung1`
3. **KHÔNG** check "Initialize with README"
4. Copy URL: `https://github.com/YOUR_USERNAME/duthithptlaivung1.git`

### **Bước 3: Push code lên GitHub**

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/duthithptlaivung1.git
git push -u origin main
```

**Lưu ý:** Cần login GitHub (sẽ hỏi username/password hoặc token)

---

## 🔐 **GitHub Authentication**

### **Cách 1: Personal Access Token (Khuyến nghị)**

1. Vào: https://github.com/settings/tokens
2. Click **"Generate new token"** > **"Generate new token (classic)"**
3. Chọn scopes:
   - ✅ `repo` (Full control of private repositories)
4. Click **"Generate token"**
5. Copy token (chỉ hiện 1 lần!)
6. Khi push, dùng token làm password

### **Cách 2: GitHub CLI**

```powershell
# Cài GitHub CLI
winget install --id GitHub.cli

# Login
gh auth login

# Push code
git push -u origin main
```

---

## 📋 **Quick Checklist**

- [ ] ✅ Cài đặt Git
- [ ] ✅ Restart PowerShell
- [ ] ✅ Cấu hình Git (name, email)
- [ ] ✅ Kiểm tra `git --version`
- [ ] ✅ Khởi tạo repo: `git init`
- [ ] ✅ Tạo GitHub repo
- [ ] ✅ Push code lên GitHub
- [ ] ✅ Tiếp tục với Cloudflare Pages setup

---

## 🆘 **Troubleshooting**

### **Lỗi: "git is not recognized" sau khi cài**

**Giải pháp:**
1. Restart PowerShell/Terminal
2. Hoặc restart máy tính
3. Kiểm tra PATH: `$env:PATH -split ';' | Select-String git`

### **Lỗi: "Permission denied" khi push**

**Giải pháp:**
- Dùng Personal Access Token thay vì password
- Hoặc dùng GitHub CLI: `gh auth login`

### **Lỗi: "Repository not found"**

**Giải pháp:**
- Kiểm tra repo URL đúng chưa
- Đảm bảo repo là public hoặc bạn có quyền truy cập

---

## ✅ **Kết Quả**

Sau khi hoàn thành:
- ✅ Git đã được cài đặt
- ✅ Code đã được push lên GitHub
- ✅ Sẵn sàng deploy lên Cloudflare Pages

**Tiếp theo:** Xem `CLOUDFLARE_PAGES_SETUP.md` để deploy! 🚀

