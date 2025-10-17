import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check, Lock } from 'lucide-react';
import { supabase } from '../../services/authService';

interface PasswordChangeFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  interfaceLanguage?: string;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ 
  onCancel, 
  onSuccess,
  interfaceLanguage = 'english' 
}) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Translations
  const translations: Record<string, Record<string, string>> = {
    english: {
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      passwordMinLength: "Password must be at least 6 characters",
      cancel: "Cancel",
      updatePassword: "Update Password",
      processing: "Processing...",
      updated: "Updated",
      passwordsMustMatch: "New passwords do not match",
      pleaseEnterCurrentPassword: "Please enter your current password",
      pleaseEnterNewPassword: "Please enter a new password",
      passwordSuccess: "Password updated successfully",
      passwordError: "Failed to change password. Please try again."
    },
    setswana: {
      currentPassword: "Khunololamoraba ya Jaanong",
      newPassword: "Khunololamoraba e Ntšha",
      confirmPassword: "Tlhomamisa Khunololamoraba e Ntšha",
      passwordMinLength: "Khunololamoraba e tshwanetse go nna le bonnyane go ya kwa ditlhakeng di le 6",
      cancel: "Khansela",
      updatePassword: "Mpontšha Khunololamoraba",
      processing: "E a dira...",
      updated: "E fetogile",
      passwordsMustMatch: "Dikhunololamoraba tse ntšha ga di tshwane",
      pleaseEnterCurrentPassword: "Tswee-tswee tsenya khunololamoraba ya jaanong",
      pleaseEnterNewPassword: "Tswee-tswee tsenya khunololamoraba e ntšha",
      passwordSuccess: "Khunololamoraba e ntšha e beilwe ka katlego",
      passwordError: "Go palegile go fetola khunololamoraba. Tswee-tswee leka gape."
    },
    swahili: {
      currentPassword: "Nenosiri la Sasa",
      newPassword: "Nenosiri Jipya",
      confirmPassword: "Thibitisha Nenosiri Jipya",
      passwordMinLength: "Nenosiri lazima liwe na angalau herufi 6",
      cancel: "Ghairi",
      updatePassword: "Sasisha Nenosiri",
      processing: "Inasindika...",
      updated: "Imesasishwa",
      passwordsMustMatch: "Manenosiri mapya hayalingani",
      pleaseEnterCurrentPassword: "Tafadhali weka nenosiri lako la sasa",
      pleaseEnterNewPassword: "Tafadhali weka nenosiri jipya",
      passwordSuccess: "Nenosiri limesasishwa kwa mafanikio",
      passwordError: "Imeshindwa kubadilisha nenosiri. Tafadhali jaribu tena."
    }
  };

  const getTranslation = (key: string): string => {
    return translations[interfaceLanguage]?.[key] || translations.english[key] || key;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    // Reset error
    setError(null);

    // Check if current password is provided
    if (!formData.currentPassword) {
      setError('Please enter your current password.');
      setError('I need your current password first.');
      return false;
    }

    // Check if new password is provided
    if (!formData.newPassword) {
      setError('Please enter your new password.');
      setError('What would you like your new password to be?');
      return false;
    }

    // Check if new password is at least 6 characters
    if (formData.newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      setError('That new password\'s a bit short. How about at least 6 characters?');
      return false;
    }

    // Check if passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('The new passwords you entered do not match.');
      setError('Those new passwords don\'t match. Could you try typing them again?');
      return false;
    }

    // All validations passed
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: '', // We'll get this from the session
        password: formData.currentPassword
      });

      // If there's an error, the current password is incorrect
      if (signInError) {
        setError('The current password you entered is incorrect.');
        setError('That current password doesn\'t look right. Mind checking it?');
        setIsLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Password updated successfully
      setSuccessMessage('Your password has been updated successfully!');
      setSuccessMessage('Password updated – you\'re all set!');
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Notify parent component
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || 'Uhuru could not change your password. Please try again.');
      setError(error.message || 'I couldn\'t update that password. Want to try again?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
          {getTranslation('currentPassword')}
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            name="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={formData.currentPassword}
            onChange={handleChange}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal focus:border-transparent"
            placeholder="••••••••"
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          {getTranslation('newPassword')}
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleChange}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal focus:border-transparent"
            placeholder="••••••••"
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {getTranslation('passwordMinLength')}
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          {getTranslation('confirmPassword')}
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal focus:border-transparent"
            placeholder="••••••••"
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
        >
          {getTranslation('cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className={`px-4 py-2 rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors duration-200 flex items-center gap-2 ${
            (isLoading || !!successMessage) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {getTranslation('processing')}
            </>
          ) : successMessage ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              {getTranslation('updated')}
            </>
          ) : (
            getTranslation('updatePassword')
          )}
        </button>
      </div>
    </form>
  );
};

export default PasswordChangeForm;