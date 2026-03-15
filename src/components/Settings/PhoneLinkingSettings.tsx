import React, { useState, useEffect } from 'react';
import { Phone, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import CountryCodeSelector from '../CountryCodeSelector';
import { countries, Country } from '../../utils/countryCodes';

interface PhoneLinkingSettingsProps {
  darkMode?: boolean;
  interfaceLanguage?: string;
}

const PhoneLinkingSettings: React.FC<PhoneLinkingSettingsProps> = ({
  darkMode: _darkMode = false,
  interfaceLanguage: _interfaceLanguage = 'english'
}) => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  useEffect(() => {
    checkLinkedPhone();
  }, [user]);

  const checkLinkedPhone = async () => {
    if (!user) return;

    try {
      // Check if user already has a phone number linked
      const userPhone = user.phone || user.user_metadata?.phone_number;
      if (userPhone) {
        setLinkedPhone(userPhone);
      }
    } catch (error: any) {
      console.error('Error checking linked phone:', error);
    }
  };

  const handleSendVerification = async () => {
    setError(null);
    setSuccess(null);

    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/^0+/, '')}`;

    // Validate phone number format
    const phoneRegex = /^\+\d{7,15}$/;
    if (!phoneRegex.test(fullPhoneNumber)) {
      setError('Please enter a valid phone number with country code');
      return;
    }

    setIsLinking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-phone-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ phone_number: fullPhoneNumber })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setShowVerification(true);
      setSuccess('Verification code sent! Check your phone.');
    } catch (error: any) {
      console.error('Error sending verification:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleVerifyAndLink = async () => {
    setError(null);
    setSuccess(null);

    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/^0+/, '')}`;

    setIsVerifying(true);

    try {
      // Verify the code
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-phone-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            phone_number: fullPhoneNumber,
            code: verificationCode
          })
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

      // Update user's phone number
      const { error: updateError } = await supabase.auth.updateUser({
        phone: fullPhoneNumber
      });

      if (updateError) {
        throw updateError;
      }

      setLinkedPhone(fullPhoneNumber);
      setSuccess('Phone number successfully linked! You can now sign in with either email or phone.');
      setShowVerification(false);
      setPhoneNumber('');
      setVerificationCode('');
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnlinkPhone = async () => {
    if (!confirm('Are you sure you want to unlink your phone number? You will only be able to sign in with email.')) {
      return;
    }

    setIsUnlinking(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        phone: undefined
      });

      if (updateError) {
        throw updateError;
      }

      setLinkedPhone(null);
      setSuccess('Phone number unlinked successfully');
    } catch (error: any) {
      console.error('Error unlinking phone:', error);
      setError(error.message || 'Failed to unlink phone number');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-navy font-headline mb-2">
          Link Phone Number
        </h3>
        <p className="text-sm text-navy">
          Link your phone number to sign in with either email or phone number
        </p>
      </div>

      {linkedPhone ? (
        <div className="p-4 rounded-12 border border-borders bg-sand-200/50 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-navy">Linked Phone Number</h4>
                <p className="text-sm text-navy mt-1">{linkedPhone}</p>
                <p className="text-xs text-navy mt-2">
                  You can sign in using either your email or this phone number
                </p>
              </div>
            </div>
            <button
              onClick={handleUnlinkPhone}
              disabled={isUnlinking}
              className="px-3 py-1.5 rounded-12 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnlinking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Unlink'
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!showVerification ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-navy">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelectCountry={setSelectedCountry}
                  />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="71234567"
                    className="flex-1 px-4 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <p className="text-xs text-navy mt-1">
                  Enter your phone number without the leading zero
                </p>
              </div>

              <button
                onClick={handleSendVerification}
                disabled={isLinking || !phoneNumber.trim()}
                className="w-full px-4 py-2 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="p-4 rounded-12 bg-teal/10 border border-teal/20">
                <p className="text-sm text-navy">
                  Verification code sent to {selectedCountry.dialCode}{phoneNumber}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-navy">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-12 border border-borders text-navy focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowVerification(false);
                    setVerificationCode('');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-12 bg-white hover:bg-sand-200 text-navy border border-borders transition-colors duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyAndLink}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="flex-1 px-4 py-2 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify & Link</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={handleSendVerification}
                disabled={isLinking}
                className="w-full text-sm text-teal hover:text-teal/80 transition-colors duration-200"
              >
                Resend code
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-12 bg-red-50 border border-red-200 flex items-start gap-2">
          <X className="w-4 h-4 text-red-600 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-12 bg-green-50 border border-green-200 flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 mt-0.5" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="p-4 rounded-12 bg-sand-200/50 border border-borders">
        <h4 className="text-sm font-medium text-navy mb-2">About Phone Linking</h4>
        <ul className="text-xs text-navy space-y-1">
          <li>• Link your phone to use either email or phone for sign in</li>
          <li>• Your phone will be verified via SMS</li>
          <li>• You can unlink your phone number at any time</li>
          <li>• Standard SMS rates may apply</li>
        </ul>
      </div>
    </div>
  );
};

export default PhoneLinkingSettings;
