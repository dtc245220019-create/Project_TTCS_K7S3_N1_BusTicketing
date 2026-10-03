import hashlib
import hmac
import unittest

from app.payment_gateway import (
    create_zalopay_mac,
    verify_zalopay_callback,
)


class PaymentTest(unittest.TestCase):

    def test_zalopay_mac(self):
        data = '{"transaction_code":"ZLP123","amount":100000}'
        key = "test-key"

        mac = create_zalopay_mac(data, key)

        expected = hmac.new(
            key.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()

        self.assertEqual(mac, expected)

    def test_zalopay_callback_valid(self):
        data = '{"transaction_code":"ZLP123","amount":100000}'
        key = "test-key"

        mac = create_zalopay_mac(data, key)

        self.assertTrue(
            verify_zalopay_callback(data, mac, key)
        )

    def test_zalopay_callback_invalid(self):
        data = '{"transaction_code":"ZLP123","amount":100000}'

        self.assertFalse(
            verify_zalopay_callback(
                data,
                "wrong-mac",
                "test-key"
            )
        )


if __name__ == "__main__":
    unittest.main()
