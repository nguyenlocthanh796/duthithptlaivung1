# 🔧 Fix Git Not Found trong PowerShell

## ❌ **Vấn đề: Git đã cài nhưng PowerShell không tìm thấy**

Sau khi cài Git Bash, PowerShell có thể không tìm thấy Git vì:
- Git chưa được thêm vào System PATH
- PowerShell chưa được restart sau khi cài Git

---

## ✅ **Giải Pháp Nhanh**

### **Cách 1: Restart PowerShell** ⭐ (Dễ nhất)

1. **Đóng PowerShell hiện tại**
2. **Mở PowerShell mới**
3. **Test:**
   ```powershell
   git --version
   ```

Nếu vẫn không được, thử Cách 2.

---

### **Cách 2: Thêm Git Vào PATH** ⭐⭐

#### **Bước 1: Tìm đường dẫn Git**

Git thường được cài ở:
- `C:\Program Files\Git\bin\git.exe`
- `C:\Program Files (x86)\Git\bin\git.exe`

Kiểm tra:
```powershell
Test-Path "C:\Program Files\Git\bin\git.exe"
```

#### **Bước 2: Thêm vào PATH**

**Option A: Qua System Properties (GUI)**

1. Nhấn `Win + R`
2. Gõ: `sysdm.cpl`
3. Enter
4. Tab **"Advanced"**
5. Click **"Environment Variables"**
6. Trong **"System variables"**, tìm **"Path"**
7. Click **"Edit"**
8. Click **"New"**
9. Thêm: `C:\Program Files\Git\bin`
10. Click **"OK"** tất cả
11. **Restart PowerShell**

**Option B: Qua PowerShell (Command Line)**

```powershell
# Thêm Git vào PATH (cho session hiện tại)
$env:Path += ";C:\Program Files\Git\bin"

# Test
git --version

# Thêm vĩnh viễn (cần chạy PowerShell as Administrator)
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\Git\bin",
    "Machine"
)
```

Sau đó **restart PowerShell**.

---

### **Cách 3: Dùng Git Bash Thay Vì PowerShell** ⭐

Nếu không muốn thêm vào PATH, dùng Git Bash:

1. Mở **Git Bash** (từ Start Menu)
2. Navigate đến project:
   ```bash
   cd /d/duthithptlaivung1
   ```
3. Chạy script:
   ```bash
   python deploy.py
   ```

---

## 🔍 **Kiểm Tra Git**

### **Test Git hoạt động:**

```powershell
# Test Git version
git --version

# Test Git commands
git status
git config --list
```

### **Nếu vẫn không được:**

1. **Kiểm tra Git đã cài:**
   ```powershell
   Test-Path "C:\Program Files\Git\bin\git.exe"
   ```

2. **Kiểm tra PATH:**
   ```powershell
   $env:Path -split ';' | Select-String git
   ```

3. **Thêm thủ công:**
   ```powershell
   # Tạm thời (cho session này)
   $env:Path += ";C:\Program Files\Git\bin"
   
   # Test
   git --version
   ```

---

## ✅ **Sau Khi Fix**

Sau khi Git hoạt động, script `deploy.py` sẽ tự động tìm và sử dụng Git.

**Test lại:**
```powershell
cd D:\duthithptlaivung1
python deploy.py
# Chọn option 3: Push Code to GitHub
```

---

## 🎯 **Quick Fix (Tạm thời)**

Nếu cần dùng ngay, thêm vào đầu PowerShell session:

```powershell
$env:Path += ";C:\Program Files\Git\bin"
cd D:\duthithptlaivung1
python deploy.py
```

Hoặc tạo file `fix-git-path.ps1`:

```powershell
# fix-git-path.ps1
$env:Path += ";C:\Program Files\Git\bin"
Write-Host "✅ Git added to PATH for this session" -ForegroundColor Green
```

Chạy trước khi dùng `deploy.py`:
```powershell
. .\fix-git-path.ps1
python deploy.py
```

---

## 📝 **Lưu Ý**

1. **Restart PowerShell** sau khi thêm vào PATH
2. **Git Bash** luôn có Git (không cần PATH)
3. Script `deploy.py` đã được cập nhật để tự tìm Git ở các vị trí phổ biến

---

## ✅ **Kết Quả**

Sau khi fix:
- ✅ PowerShell tìm thấy Git
- ✅ `deploy.py` có thể push code lên GitHub
- ✅ Tất cả Git commands hoạt động

**Chúc bạn fix thành công!** 🎉

