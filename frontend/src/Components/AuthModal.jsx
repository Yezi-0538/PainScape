// src/Components/AuthModal.jsx
import React, { useState } from 'react';
import { supabase } from "../services/supabaseClient";

const PRESET_AVATARS = ["🩸", "🌸", "🔮", "🌿", "🧘", "🩹", "🍀", "🌙"];

export default function AuthModal({ isOpen, onAuthSuccess, onGuestLogin, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🩸');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. 注册逻辑
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      setErrorMsg("请完整填写注册信息！");
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const userId = data?.user?.id ?? data?.session?.user?.id;
      if (!userId) {
        throw new Error('注册成功但未获取用户信息，请检查邮箱是否已确认。');
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email: email,
          nickname: nickname,
          avatar: avatar,
          signature: "让说不出的痛，换一种方式抵达。🧘",
          bg_index: 0
        });

      if (profileError) throw profileError;
      onAuthSuccess(userId);
    } catch (err) {
      setErrorMsg(err.message || "注册失败，请检查网络或格式");
    } finally {
      setLoading(false);
    }
  };

  // 2. 登录逻辑
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("请填写账号和密码！");
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const userId = data?.user?.id ?? data?.session?.user?.id;
      if (userId) {
        onAuthSuccess(userId);
      }
      else{
        throw new Error('登录成功但未获取用户信息，请稍后重试。');
      }
    } catch (err) {
      setErrorMsg(err.message || "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  // 3. 游客访问逻辑
  const handleGuestAccess = () => {
    const guestUid = `guest_${Math.random().toString(36).substr(2, 9)}`;
    onGuestLogin(guestUid);
  };

  // 🌟 核心修改：点击 ✕ 关闭按钮时，默认进入游客模式并关闭弹窗
  const handleCloseClick = () => {
    handleGuestAccess();
    if (onClose) onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(5, 5, 5, 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 'var(--space-lg)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#141414',
        border: '1px solid #333',
        borderRadius: '24px',
        padding: '24px',
        width: '100%',
        maxWidth: 'var(--container-sm)',
        boxSizing: 'border-box',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>

        {/* 顶部 Header 与 ✕ 游客关闭按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            PainScape
          </h2>
          <button
            onClick={handleCloseClick}
            title="暂不登录，以游客身份进入"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ color: '#666', fontSize: '11px', margin: '0 0 20px 0' }}>
          让说不出的痛，换一种方式抵达
        </p>

        {/* 顶部标签切换栏 */}
        <div style={{
          display: 'flex',
          background: '#0a0a0a',
          borderRadius: '30px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid #222'
        }}>
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: '25px', border: 'none', fontSize: '13px', cursor: 'pointer',
              background: activeTab === 'login' ? '#d32f2f' : 'transparent',
              color: activeTab === 'login' ? '#fff' : '#888',
              fontWeight: activeTab === 'login' ? 'bold' : 'normal'
            }}
          >
            登录账号
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: '25px', border: 'none', fontSize: '13px', cursor: 'pointer',
              background: activeTab === 'register' ? '#d32f2f' : 'transparent',
              color: activeTab === 'register' ? '#fff' : '#888',
              fontWeight: activeTab === 'register' ? 'bold' : 'normal'
            }}
          >
            注册新档案
          </button>
        </div>

        {/* 核心表单区域 */}
        <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <input
            type="email"
            placeholder="请输入电子邮箱 (Email)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
          />

          <input
            type="password"
            placeholder="请输入账户密码 (Password)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
          />

          {/* 只有在“注册”时才显示昵称和头像选择 */}
          {activeTab === 'register' && (
            <>
              <input
                type="text"
                maxLength={12}
                placeholder="设置您的自愈昵称"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />

              <div>
                <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>挑选首个具身体感符号（头像）</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {PRESET_AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      style={{
                        fontSize: '18px', padding: '6px 0', cursor: 'pointer',
                        background: avatar === emoji ? 'rgba(211,47,47,0.15)' : 'rgba(255,255,255,0.02)',
                        border: avatar === emoji ? '1.5px solid #d32f2f' : '1px solid #2a2a2a',
                        borderRadius: '10px'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <p style={{ color: '#ef5350', fontSize: '11.5px', margin: '4px 0 0 0', textAlign: 'center', lineHeight: '1.4' }}>
              ⚠️ {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0', border: 'none', borderRadius: '30px', fontSize: 'var(--text-base)', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px',
              background: 'linear-gradient(135deg, #ff9800, #f44336)', color: '#fff',
              boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)'
            }}
          >
            {loading ? "正在同步档案中..." : (activeTab === 'login' ? "安全登录" : "创建档案并登录")}
          </button>
        </form>

        {/* 游客快捷访问通道 */}
        <div style={{ borderTop: '1px solid #222', marginTop: '20px', paddingTop: '16px', textAlign: 'center' }}>
          <button
            onClick={handleGuestAccess}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            ⚡️ 暂不注册，以游客身份快速进入
          </button>
        </div>

      </div>
    </div>
  );
}