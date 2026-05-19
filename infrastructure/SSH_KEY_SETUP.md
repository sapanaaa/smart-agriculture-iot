# SSH Key Setup for AWS Deployment

## What Changed?

Terraform now **automatically creates** the EC2 key pair from your local SSH key. You **don't need to create a key pair manually** in AWS Console anymore!

---

## Prerequisites

You need an SSH key on your local machine. Check if you have one:

```bash
ls ~/.ssh/id_rsa.pub
```

### If you DON'T have an SSH key (shows "No such file"):

Generate one:

```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

Press Enter for all prompts (use default location, no passphrase).

This creates:
- `~/.ssh/id_rsa` — Private key (keep secret!)
- `~/.ssh/id_rsa.pub` — Public key (this goes to AWS)

---

## How It Works

### **1. Terraform Creates Key Pair Automatically**

When you run `terraform apply`, Terraform:
1. Reads your local **public key** (`~/.ssh/id_rsa.pub`)
2. Uploads it to AWS as an EC2 key pair
3. Names it `agrisense-iot-key`

**You don't need to download a `.pem` file** because you already have the private key (`~/.ssh/id_rsa`)!

---

### **2. GitHub Actions Uses Your Private Key**

For GitHub Actions to SSH into EC2, you need to add your **private key** as a GitHub Secret:

#### **Step 1: Copy your private key**

```bash
cat ~/.ssh/id_rsa
```

Copy the **entire output** including:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(many lines)
...
-----END RSA PRIVATE KEY-----
```

#### **Step 2: Add to GitHub Secrets**

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `EC2_SSH_KEY`
4. Value: Paste the entire private key content
5. Click **Add secret**

---

## Deployment Flow

### **Local Deployment (Terraform)**

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

✅ Terraform uploads your **public key** to AWS  
✅ EC2 instance is created with that key  
✅ You can SSH using your existing private key:

```bash
ssh -i ~/.ssh/id_rsa ubuntu@<EC2_PUBLIC_IP>
```

---

### **GitHub Actions Deployment**

When you push code:

1. GitHub Actions reads `EC2_SSH_KEY` secret (your private key)
2. Saves it to `~/.ssh/id_rsa` on the runner
3. Uses it to SSH into EC2:
   ```bash
   ssh -i ~/.ssh/id_rsa ubuntu@<EC2_IP>
   ```

---

## Security Notes

### ✅ **Safe**
- Public key (`id_rsa.pub`) is uploaded to AWS — this is safe
- Private key stays on your machine and in GitHub Secrets (encrypted)

### ❌ **Never Do This**
- Don't commit `id_rsa` (private key) to Git
- Don't share your private key with anyone
- Don't add the private key to `.env` files

---

## Troubleshooting

### Error: "Permission denied (publickey)"

**Solution 1:** Check SSH key permissions
```bash
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

**Solution 2:** Verify key is loaded
```bash
ssh-add ~/.ssh/id_rsa
```

**Solution 3:** Test connection
```bash
ssh -v -i ~/.ssh/id_rsa ubuntu@<EC2_IP>
# -v = verbose mode, shows detailed error messages
```

---

### Error: Terraform can't find `~/.ssh/id_rsa.pub`

**Solution:** Generate SSH key first:
```bash
ssh-keygen -t rsa -b 4096
```

---

### Error: GitHub Actions "Host key verification failed"

This shouldn't happen (we use `-o StrictHostKeyChecking=no`), but if it does:

**Solution:** Make sure `EC2_SSH_KEY` secret contains the **private key**, not the public key.

---

## Comparison: Old vs New Approach

### **Old Approach (Manual Key Pair)**
1. ❌ Go to AWS Console → EC2 → Key Pairs
2. ❌ Click "Create key pair"
3. ❌ Download `.pem` file
4. ❌ Add to GitHub Secrets
5. ❌ Update Terraform variable `ssh_key_name`

### **New Approach (Automatic)**
1. ✅ Generate SSH key once (if you don't have one)
2. ✅ Terraform auto-uploads public key
3. ✅ Use existing private key
4. ✅ Add private key to GitHub Secrets (one time)

**Result:** No manual AWS Console steps needed! 🎉

---

## Summary

| What | Where | Purpose |
|------|-------|---------|
| `~/.ssh/id_rsa.pub` | Your computer | Public key (uploaded to AWS by Terraform) |
| `~/.ssh/id_rsa` | Your computer + GitHub Secret | Private key (for SSH access) |
| `agrisense-iot-key` | AWS EC2 | Auto-created key pair name |

**You only need:**
1. Local SSH key pair (one-time setup)
2. Private key in GitHub Secrets (one-time setup)
3. Run `terraform apply` (uploads public key automatically)

That's it! 🚀
