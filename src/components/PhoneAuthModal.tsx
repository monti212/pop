import PhoneOtpAuthModal, { type PhoneOtpAuthModalProps } from './PhoneOtpAuthModal';

type PhoneAuthModalProps = Omit<PhoneOtpAuthModalProps, 'channel'>;

export default function PhoneAuthModal(props: PhoneAuthModalProps) {
  return <PhoneOtpAuthModal {...props} channel="sms" />;
}
