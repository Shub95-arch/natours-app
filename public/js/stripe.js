const stripe = Stripe(
  'pk_test_51PnDpCJiBurjL7tRu1dbsbEFXZjSU4tZoBGFZM63bMba4Bv2maIxVgnU2fk2rnqWoW1i2fL8ee9KV7C7kw2M1fjn00gV0HnqcI',
);
import axios from 'axios';
import { show_alert } from './alert';

export const bookTour = async (tourId) => {
  try {
    //1> Get the checkout session from the endpoint
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);

    //2> Create checoutout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    show_alert('error', err);
  }
};
