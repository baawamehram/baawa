import { useState, useEffect, useCallback } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface ProfileTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
  token?: string
  on401?: () => void
}

interface ClientData {
  id: number
  founder_name: string
  company_name: string
  email: string
  phone?: string
  website?: string
  start_date: string
  stage: string
  phase1_fee?: number
  phase2_monthly_fee?: number
  [key: string]: any
}

interface ValidationErrors {
  [key: string]: string
}

// Validation functions
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const validatePhone = (phone: string): boolean => {
  return /^\+?[\d\s\-()]{10,}$/.test(phone)
}

const validateWebsite = (url: string): boolean => {
  return /^(https?:\/\/)?[\w\-\.]+\.[a-z]{2,}/.test(url)
}

const validateFee = (fee: number): boolean => {
  return fee > 0
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStageLabel(stage: string): string {
  const labels: { [key: string]: string } = {
    phase1: 'Phase 1 - Engagement',
    phase2: 'Phase 2 - Ongoing',
    churned: 'Churned',
  }
  return labels[stage] || stage
}

function getStageColor(stage: string, theme: any): string {
  switch (stage) {
    case 'phase1':
      return theme.statusReviewing
    case 'phase2':
      return theme.statusSuccess
    case 'churned':
      return theme.statusError
    default:
      return theme.textMuted
  }
}

export function ProfileTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: ProfileTabProps) {
  const { theme } = useDashboardTheme()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<ClientData> | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const stableOn401 = useCallback(on401, [on401])

  // Fetch client data
  const fetchClientData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      setError('')
      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401)
      if (!res) return

      if (!res.ok) {
        setError('Failed to load client data')
        return
      }

      const data = await res.json()
      setClientData(data)
    } catch (err) {
      console.error('Error fetching client data:', err)
      setError('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }, [clientId, token, stableOn401])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  // Validate fields based on role
  const validateFields = (data: Partial<ClientData>, checkAll: boolean = false): ValidationErrors => {
    const errors: ValidationErrors = {}

    if (checkAll || data.founder_name !== undefined) {
      if (!data.founder_name || !data.founder_name.trim()) {
        errors.founder_name = 'Name is required'
      }
    }

    if (checkAll || data.company_name !== undefined) {
      if (!data.company_name || !data.company_name.trim()) {
        errors.company_name = 'Company name is required'
      }
    }

    if (checkAll || data.email !== undefined) {
      if (!data.email || !data.email.trim()) {
        errors.email = 'Email is required'
      } else if (!validateEmail(data.email)) {
        errors.email = 'Invalid email format'
      }
    }

    if (data.phone && data.phone.trim() && !validatePhone(data.phone)) {
      errors.phone = 'Invalid phone format'
    }

    if (data.website && data.website.trim() && !validateWebsite(data.website)) {
      errors.website = 'Invalid website URL'
    }

    if (data.phase1_fee !== undefined && data.phase1_fee !== null && !validateFee(data.phase1_fee)) {
      errors.phase1_fee = 'Fee must be positive'
    }

    if (data.phase2_monthly_fee !== undefined && data.phase2_monthly_fee !== null && !validateFee(data.phase2_monthly_fee)) {
      errors.phase2_monthly_fee = 'Fee must be positive'
    }

    return errors
  }

  // Enter edit mode
  const handleEditMode = () => {
    if (!clientData) return
    setEditData({ ...clientData })
    setValidationErrors({})
    setSaveError('')
    setSaveSuccess(false)
    setIsEditMode(true)
  }

  // Cancel edit mode
  const handleCancel = () => {
    setIsEditMode(false)
    setEditData(null)
    setValidationErrors({})
    setSaveError('')
  }

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    if (!editData) return
    const newData = { ...editData, [field]: value }
    setEditData(newData)

    // Clear error for this field when user starts typing
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors }
      delete newErrors[field]
      setValidationErrors(newErrors)
    }
  }

  // Save changes
  const handleSave = async () => {
    if (!editData || !token) return

    // Validate all required fields
    const errors = validateFields(editData, true)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      // Build update payload - only include fields that were edited
      const updatePayload: Partial<ClientData> = {}
      const fieldsToUpdate = isAdmin
        ? ['founder_name', 'company_name', 'email', 'phone', 'website', 'phase1_fee', 'phase2_monthly_fee']
        : ['email', 'phone', 'website']

      for (const field of fieldsToUpdate) {
        if (editData[field as keyof ClientData] !== clientData?.[field as keyof ClientData]) {
          updatePayload[field as keyof ClientData] = editData[field as keyof ClientData]
        }
      }

      // If no changes, just exit edit mode
      if (Object.keys(updatePayload).length === 0) {
        setIsEditMode(false)
        setEditData(null)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        return
      }

      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      })

      if (!res) {
        setSaveError('Authentication failed')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setSaveError(errorData.message || 'Failed to save changes')
        return
      }

      const updatedData = await res.json()
      setClientData(updatedData)
      setIsEditMode(false)
      setEditData(null)
      setValidationErrors({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving changes:', err)
      setSaveError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>PROFILE</h3>
        <div style={{ padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
          Loading profile...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>PROFILE</h3>
        <div style={{ padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, color: theme.statusError }}>
          {error}
        </div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>PROFILE</h3>
        <div style={{ padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, color: theme.textMuted }}>
          Client data not found
        </div>
      </div>
    )
  }

  const displayData = isEditMode && editData ? editData : clientData
  const canEdit = isAdmin || !isAdmin // Both admin and client can have limited edit

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: 0, letterSpacing: '0.05em' }}>PROFILE</h3>
        {!isEditMode && canEdit && (
          <button
            onClick={handleEditMode}
            style={{
              padding: '8px 16px',
              background: theme.accent,
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = theme.accent)}
          >
            Edit
          </button>
        )}
      </div>

      {/* Success message */}
      {saveSuccess && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: theme.statusSuccess,
          color: '#ffffff',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          Changes saved successfully
        </div>
      )}

      {/* Error message */}
      {saveError && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: theme.statusError,
          color: '#ffffff',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{saveError}</span>
          <button
            onClick={() => setSaveError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {isEditMode && editData ? (
        // Edit Mode
        <div style={{ background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '24px' }}>
            {/* Contact Information */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Contact Information
              </h4>

              {/* Name field */}
              {isAdmin && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={(editData?.founder_name) || ''}
                    onChange={(e) => handleFieldChange('founder_name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.founder_name ? theme.statusError : theme.border}`,
                      borderRadius: '6px',
                      background: theme.input,
                      color: theme.text,
                      fontSize: '14px',
                      fontFamily: "'Outfit', sans-serif",
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      if (!validationErrors.founder_name) {
                        e.currentTarget.style.borderColor = theme.accent
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = validationErrors.founder_name ? theme.statusError : theme.border
                    }}
                  />
                  {validationErrors.founder_name && (
                    <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                      {validationErrors.founder_name}
                    </div>
                  )}
                </div>
              )}

              {/* Company field */}
              {isAdmin && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                    Company
                  </label>
                  <input
                    type="text"
                    value={(editData?.company_name) || ''}
                    onChange={(e) => handleFieldChange('company_name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.company_name ? theme.statusError : theme.border}`,
                      borderRadius: '6px',
                      background: theme.input,
                      color: theme.text,
                      fontSize: '14px',
                      fontFamily: "'Outfit', sans-serif",
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      if (!validationErrors.company_name) {
                        e.currentTarget.style.borderColor = theme.accent
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = validationErrors.company_name ? theme.statusError : theme.border
                    }}
                  />
                  {validationErrors.company_name && (
                    <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                      {validationErrors.company_name}
                    </div>
                  )}
                </div>
              )}

              {/* Email field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={(editData?.email) || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${validationErrors.email ? theme.statusError : theme.border}`,
                    borderRadius: '6px',
                    background: theme.input,
                    color: theme.text,
                    fontSize: '14px',
                    fontFamily: "'Outfit', sans-serif",
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    if (!validationErrors.email) {
                      e.currentTarget.style.borderColor = theme.accent
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = validationErrors.email ? theme.statusError : theme.border
                  }}
                />
                {validationErrors.email && (
                  <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                    {validationErrors.email}
                  </div>
                )}
              </div>

              {/* Phone field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                  Phone <span style={{ color: theme.textMuted }}>(optional)</span>
                </label>
                <input
                  type="tel"
                  value={(editData?.phone) || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${validationErrors.phone ? theme.statusError : theme.border}`,
                    borderRadius: '6px',
                    background: theme.input,
                    color: theme.text,
                    fontSize: '14px',
                    fontFamily: "'Outfit', sans-serif",
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    if (!validationErrors.phone) {
                      e.currentTarget.style.borderColor = theme.accent
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = validationErrors.phone ? theme.statusError : theme.border
                  }}
                />
                {validationErrors.phone && (
                  <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                    {validationErrors.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Web Presence & Fees */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Web Presence & Details
              </h4>

              {/* Website field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                  Website <span style={{ color: theme.textMuted }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={(editData?.website) || ''}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${validationErrors.website ? theme.statusError : theme.border}`,
                    borderRadius: '6px',
                    background: theme.input,
                    color: theme.text,
                    fontSize: '14px',
                    fontFamily: "'Outfit', sans-serif",
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    if (!validationErrors.website) {
                      e.currentTarget.style.borderColor = theme.accent
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = validationErrors.website ? theme.statusError : theme.border
                  }}
                />
                {validationErrors.website && (
                  <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                    {validationErrors.website}
                  </div>
                )}
              </div>

              {/* Phase 1 Fee (admin only) */}
              {isAdmin && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                    Phase 1 Fee <span style={{ color: theme.textMuted }}>(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={(editData?.phase1_fee) || ''}
                    onChange={(e) => handleFieldChange('phase1_fee', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.phase1_fee ? theme.statusError : theme.border}`,
                      borderRadius: '6px',
                      background: theme.input,
                      color: theme.text,
                      fontSize: '14px',
                      fontFamily: "'Outfit', sans-serif",
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      if (!validationErrors.phase1_fee) {
                        e.currentTarget.style.borderColor = theme.accent
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = validationErrors.phase1_fee ? theme.statusError : theme.border
                    }}
                  />
                  {validationErrors.phase1_fee && (
                    <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                      {validationErrors.phase1_fee}
                    </div>
                  )}
                </div>
              )}

              {/* Phase 2 Fee (admin only) */}
              {isAdmin && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                    Phase 2 Monthly Fee <span style={{ color: theme.textMuted }}>(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={(editData?.phase2_monthly_fee) || ''}
                    onChange={(e) => handleFieldChange('phase2_monthly_fee', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.phase2_monthly_fee ? theme.statusError : theme.border}`,
                      borderRadius: '6px',
                      background: theme.input,
                      color: theme.text,
                      fontSize: '14px',
                      fontFamily: "'Outfit', sans-serif",
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      if (!validationErrors.phase2_monthly_fee) {
                        e.currentTarget.style.borderColor = theme.accent
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = validationErrors.phase2_monthly_fee ? theme.statusError : theme.border
                    }}
                  />
                  {validationErrors.phase2_monthly_fee && (
                    <div style={{ fontSize: '12px', color: theme.statusError, marginTop: '4px' }}>
                      {validationErrors.phase2_monthly_fee}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
                opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.background = theme.card
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(validationErrors).length > 0}
              style={{
                padding: '10px 20px',
                background: Object.keys(validationErrors).length > 0 ? theme.textMuted : theme.accent,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: Object.keys(validationErrors).length > 0 || saving ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                transition: 'background-color 0.2s',
                opacity: Object.keys(validationErrors).length > 0 || saving ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (Object.keys(validationErrors).length === 0 && !saving) {
                  e.currentTarget.style.background = theme.accentHover
                }
              }}
              onMouseLeave={(e) => {
                if (Object.keys(validationErrors).length === 0 && !saving) {
                  e.currentTarget.style.background = theme.accent
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        // View Mode
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Contact Information Card */}
          <div style={{ background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Contact Information
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                  NAME
                </div>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {displayData.founder_name}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                  COMPANY
                </div>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {displayData.company_name}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                  EMAIL
                </div>
                <a href={`mailto:${displayData.email}`} style={{ fontSize: '14px', color: theme.accent, textDecoration: 'none', cursor: 'pointer' }}>
                  {displayData.email}
                </a>
              </div>
              {displayData.phone && (
                <div>
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    PHONE
                  </div>
                  <a href={`tel:${displayData.phone}`} style={{ fontSize: '14px', color: theme.accent, textDecoration: 'none', cursor: 'pointer' }}>
                    {displayData.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Web Presence Card */}
          <div style={{ background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Web Presence
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {displayData.website ? (
                <div>
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    WEBSITE
                  </div>
                  <a href={(displayData.website as string).startsWith('http') ? (displayData.website as string) : `https://${displayData.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: theme.accent, textDecoration: 'none', cursor: 'pointer' }}>
                    {displayData.website}
                  </a>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    WEBSITE
                  </div>
                  <div style={{ fontSize: '14px', color: theme.textMuted }}>
                    Not provided
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Engagement Details Card */}
          <div style={{ background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Engagement Details
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                  ENGAGEMENT START DATE
                </div>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {displayData.start_date ? formatDate(displayData.start_date) : 'Not set'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                  CURRENT PHASE
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: getStageColor(displayData.stage || '', theme),
                  padding: '4px 10px',
                  borderRadius: '4px',
                  display: 'inline-block',
                }}>
                  {getStageLabel(displayData.stage || '')}
                </div>
              </div>
            </div>
          </div>

          {/* Fees Card (admin only) */}
          {isAdmin && (
            <div style={{ background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '20px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Service Fees
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    PHASE 1 FEE
                  </div>
                  <div style={{ fontSize: '14px', color: theme.text }}>
                    {displayData.phase1_fee ? `$${displayData.phase1_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not set'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    PHASE 2 MONTHLY FEE
                  </div>
                  <div style={{ fontSize: '14px', color: theme.text }}>
                    {displayData.phase2_monthly_fee ? `$${displayData.phase2_monthly_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
