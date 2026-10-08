<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['amount'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Amount is required']);
    exit;
}

$amount = intval($input['amount']); // Amount in paise
$receipt = isset($input['receipt']) ? $input['receipt'] : 'rcpt_' . uniqid();

$key_id = 'rzp_live_StBUehIpeULYuL';
$key_secret = 'M76UWnmNsVE7hU5QrkriZuor';

$data = [
    'amount' => $amount,
    'currency' => 'INR',
    'receipt' => $receipt
];

$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
} else {
    http_response_code($http_code);
    echo $response;
}

curl_close($ch);
