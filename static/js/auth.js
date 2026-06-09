/**
 * 會員註冊與登入前端表單驗證 - 詹為媺 (F-05)
 */

// 密碼顯示/隱藏切換
function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = btnEl.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 取得表單元素
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // 通用輔助函式：設定欄位驗證狀態樣式
    function setFieldStatus(inputEl, groupEl, feedbackEl, isValid, message) {
        if (isValid) {
            groupEl.classList.remove('is-invalid-group');
            groupEl.classList.add('is-valid-group');
            feedbackEl.classList.remove('invalid');
            feedbackEl.classList.add('valid');
            feedbackEl.textContent = '✓ ' + message;
        } else {
            groupEl.classList.remove('is-valid-group');
            groupEl.classList.add('is-invalid-group');
            feedbackEl.classList.remove('valid');
            feedbackEl.classList.add('invalid');
            feedbackEl.textContent = '✗ ' + message;
        }
    }

    // 通用輔助函式：清除欄位驗證狀態樣式
    function clearFieldStatus(groupEl, feedbackEl) {
        groupEl.classList.remove('is-valid-group', 'is-invalid-group');
        feedbackEl.classList.remove('valid', 'invalid');
        feedbackEl.textContent = '';
    }

    // 1. 驗證帳號格式
    function validateUsername(usernameInput, groupEl, feedbackEl) {
        const username = usernameInput.value;
        if (username.length === 0) {
            setFieldStatus(usernameInput, groupEl, feedbackEl, false, '帳號不能為空白！');
            return false;
        }
        if (username.length < 4 || username.length > 15) {
            setFieldStatus(usernameInput, groupEl, feedbackEl, false, '帳號長度需介於 4 到 15 個字元！');
            return false;
        }
        // 僅允許英文字母與數字
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(username)) {
            setFieldStatus(usernameInput, groupEl, feedbackEl, false, '帳號只能包含英文字母與數字，不能有空格或符號！');
            return false;
        }
        setFieldStatus(usernameInput, groupEl, feedbackEl, true, '帳號格式正確！');
        return true;
    }

    // 2. 驗證密碼格式
    function validatePassword(passwordInput, groupEl, feedbackEl) {
        const password = passwordInput.value;
        if (password.length === 0) {
            setFieldStatus(passwordInput, groupEl, feedbackEl, false, '密碼不能為空白！');
            return false;
        }
        if (password.length < 4 || password.length > 20) {
            setFieldStatus(passwordInput, groupEl, feedbackEl, false, '密碼長度需介於 4 到 20 個字元！');
            return false;
        }
        setFieldStatus(passwordInput, groupEl, feedbackEl, true, '密碼格式正確！');
        return true;
    }

    // ==========================================
    // 註冊頁面邏輯
    // ==========================================
    if (registerForm) {
        const usernameInput = document.getElementById('username');
        const usernameGroup = document.getElementById('username-group');
        const usernameFeedback = document.getElementById('username-feedback');

        const passwordInput = document.getElementById('password');
        const passwordGroup = document.getElementById('password-group');
        const passwordFeedback = document.getElementById('password-feedback');

        const confirmPasswordInput = document.getElementById('confirm-password');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const confirmPasswordFeedback = document.getElementById('confirm-password-feedback');

        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');

        // 3. 驗證確認密碼一致性
        function validateConfirmPassword() {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            if (confirmPassword.length === 0) {
                setFieldStatus(confirmPasswordInput, confirmPasswordGroup, confirmPasswordFeedback, false, '請再次輸入密碼！');
                return false;
            }
            if (password !== confirmPassword) {
                setFieldStatus(confirmPasswordInput, confirmPasswordGroup, confirmPasswordFeedback, false, '兩次輸入的密碼不一致！');
                return false;
            }
            setFieldStatus(confirmPasswordInput, confirmPasswordGroup, confirmPasswordFeedback, true, '密碼相符！');
            return true;
        }

        // 4. 計算密碼強度並更新 UI
        function checkPasswordStrength() {
            const password = passwordInput.value;
            
            // 重置
            strengthFill.className = 'password-strength-fill';
            strengthFill.style.width = '0%';
            
            if (password.length === 0) {
                strengthText.textContent = '密碼強度：尚未輸入';
                strengthText.className = 'password-strength-text text-muted';
                return;
            }
            
            if (password.length < 4) {
                strengthText.textContent = '密碼強度：太短';
                strengthText.className = 'password-strength-text text-strength-weak';
                strengthFill.classList.add('strength-weak');
                strengthFill.style.width = '15%';
                return;
            }

            let score = 0;
            // 基礎長度分數
            if (password.length >= 8) score += 2;
            else if (password.length >= 6) score += 1;

            // 包含數字
            if (/\d/.test(password)) score += 1;
            // 包含小寫字母
            if (/[a-z]/.test(password)) score += 1;
            // 包含大寫字母
            if (/[A-Z]/.test(password)) score += 1;
            // 包含特殊符號
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

            // 判斷強度等級
            if (score <= 2) {
                strengthText.textContent = '密碼強度：弱 ⚠️';
                strengthText.className = 'password-strength-text text-strength-weak';
                strengthFill.classList.add('strength-weak');
                strengthFill.style.width = '33.33%';
            } else if (score <= 4) {
                strengthText.textContent = '密碼強度：中 👍';
                strengthText.className = 'password-strength-text text-strength-medium';
                strengthFill.classList.add('strength-medium');
                strengthFill.style.width = '66.66%';
            } else {
                strengthText.textContent = '密碼強度：強 ✨';
                strengthText.className = 'password-strength-text text-strength-strong';
                strengthFill.classList.add('strength-strong');
                strengthFill.style.width = '100%';
            }
        }

        // 即時驗證事件監聽
        usernameInput.addEventListener('input', () => {
            validateUsername(usernameInput, usernameGroup, usernameFeedback);
        });

        passwordInput.addEventListener('input', () => {
            validatePassword(passwordInput, passwordGroup, passwordFeedback);
            checkPasswordStrength();
            if (confirmPasswordInput.value.length > 0) {
                validateConfirmPassword();
            }
        });

        confirmPasswordInput.addEventListener('input', () => {
            validateConfirmPassword();
        });

        // 提交表單驗證
        registerForm.addEventListener('submit', (e) => {
            const isUsernameValid = validateUsername(usernameInput, usernameGroup, usernameFeedback);
            const isPasswordValid = validatePassword(passwordInput, passwordGroup, passwordFeedback);
            const isConfirmValid = validateConfirmPassword();

            if (!isUsernameValid || !isPasswordValid || !isConfirmValid) {
                e.preventDefault();
                // 聚焦在第一個錯誤的欄位
                if (!isUsernameValid) usernameInput.focus();
                else if (!isPasswordValid) passwordInput.focus();
                else if (!isConfirmValid) confirmPasswordInput.focus();
            }
        });
    }

    // ==========================================
    // 登入頁面邏輯
    // ==========================================
    if (loginForm) {
        const usernameInput = document.getElementById('username');
        const usernameGroup = document.getElementById('username-group');
        const usernameFeedback = document.getElementById('username-feedback');

        const passwordInput = document.getElementById('password');
        const passwordGroup = document.getElementById('password-group');
        const passwordFeedback = document.getElementById('password-feedback');

        // 即時驗證事件監聽 (僅做基本長度檢查，不阻擋符合基本格式的輸入)
        usernameInput.addEventListener('input', () => {
            if (usernameInput.value.trim().length > 0) {
                clearFieldStatus(usernameGroup, usernameFeedback);
            }
        });

        passwordInput.addEventListener('input', () => {
            if (passwordInput.value.length > 0) {
                clearFieldStatus(passwordGroup, passwordFeedback);
            }
        });

        // 提交表單驗證
        loginForm.addEventListener('submit', (e) => {
            let isValid = true;

            if (usernameInput.value.trim().length === 0) {
                setFieldStatus(usernameInput, usernameGroup, usernameFeedback, false, '請輸入帳號！');
                isValid = false;
            }
            
            if (passwordInput.value.length === 0) {
                setFieldStatus(passwordInput, passwordGroup, passwordFeedback, false, '請輸入密碼！');
                isValid = false;
            }

            if (!isValid) {
                e.preventDefault();
                if (usernameInput.value.trim().length === 0) usernameInput.focus();
                else passwordInput.focus();
            }
        });
    }
});
