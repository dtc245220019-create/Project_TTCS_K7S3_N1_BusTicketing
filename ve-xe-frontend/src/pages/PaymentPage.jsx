import CountdownTimer from '../components/CountdownTimer';
import PaymentForm from '../components/PaymentForm';

function PaymentPage() {
  return (
    <div style={{ padding: '20px 0' }}>
      <CountdownTimer initialMinutes={10} />
      <PaymentForm />
    </div>
  );
}

export default PaymentPage;