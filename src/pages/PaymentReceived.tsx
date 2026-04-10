import PaymentReceivedForm from '@/components/forms/PaymentReceivedForm';

export default function PaymentReceived() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Payment Received</h1>
      <PaymentReceivedForm />
    </div>
  );
}
