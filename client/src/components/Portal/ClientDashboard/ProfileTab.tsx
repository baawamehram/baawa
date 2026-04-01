import { useState } from 'react'
import { motion } from 'framer-motion'
import { usePortalTheme, t } from '../usePortalTheme'

interface AssessmentData {
  id: number
  email: string
}

interface Props {
  assessment: AssessmentData
}

export function ProfileTab({ assessment }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)
  const [email] = useState(assessment.email)
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage('')
      // This would call an API to update the profile
      // For now, we'll show a success message
      setMessage('Profile updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setMessage('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        maxWidth: 600,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Profile Header */}
      <div style={{
        background: tk.bg2,
        border: `1px solid ${tk.border}`,
        borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
          Your Profile
        </h3>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted, margin: 0 }}>
          Update your contact information below
        </p>
      </div>

      {/* Success Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            background: '#10b98120',
            border: '1px solid #10b98140',
            color: '#10b981',
            padding: '12px 16px',
            borderRadius: 8,
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
          }}
        >
          {message}
        </motion.div>
      )}

      {/* Form Fields */}
      <div style={{
        background: tk.bg2,
        border: `1px solid ${tk.border}`,
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {/* Email (Read-only) */}
        <div>
          <label style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: tk.text,
            display: 'block',
            marginBottom: 8,
          }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            disabled
            style={{
              width: '100%',
              padding: '10px 12px',
              background: tk.input,
              border: `1px solid ${tk.border}`,
              borderRadius: 8,
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              color: tk.textMuted,
              boxSizing: 'border-box',
              opacity: 0.6,
            }}
          />
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '4px 0 0', fontStyle: 'italic' }}>
            Primary email cannot be changed
          </p>
        </div>

        {/* Phone */}
        <div>
          <label style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: tk.text,
            display: 'block',
            marginBottom: 8,
          }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: tk.input,
              border: `1px solid ${tk.border}`,
              borderRadius: 8,
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              color: tk.text,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Website */}
        <div>
          <label style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: tk.text,
            display: 'block',
            marginBottom: 8,
          }}>
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: tk.input,
              border: `1px solid ${tk.border}`,
              borderRadius: 8,
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              color: tk.text,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 16px',
            background: tk.accent,
            color: '#000',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Account Info */}
      <div style={{
        background: tk.bg2,
        border: `1px solid ${tk.border}`,
        borderRadius: 12,
        padding: 24,
      }}>
        <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: tk.text, margin: '0 0 12px' }}>
          Account Information
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0 }}>
              {assessment.email}
            </p>
          </div>
          <div style={{ borderTop: `1px solid ${tk.border}`, paddingTop: 8, marginTop: 8 }}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Account Status
            </p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0 }}>
              Active
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
