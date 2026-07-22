import PhoneOtpAuthModal, { type PhoneOtpAuthModalProps } from './PhoneOtpAuthModal';

type WhatsAppAuthModalProps = Omit<PhoneOtpAuthModalProps, 'channel'>;

export default function WhatsAppAuthModal(props: WhatsAppAuthModalProps) {
  return <PhoneOtpAuthModal {...props} channel="whatsapp" />;
}
