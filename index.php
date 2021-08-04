<?php
$config = json_decode(file_get_contents('config.json'));
$mysqli = new mysqli($config->DB->host, $config->DB->user, $config->DB->password, $config->DB->database);
if ($code = mysqli_connect_errno()) {
    http_response_code(500);
    echo mysqli_connect_error();
    exit();
}
$ws_url = "ws" . ($config->WS->ssl_use?'s':'') . "://{$config->WS->host}:{$config->WS->port}";

$tokens=[];
$st = $mysqli->prepare("SELECT token FROM users");
try{
    if ($st->execute()) {
        $st->bind_result($token);
        while ($st->fetch()) {
            $tokens[] = $token;
        }
    }
} finally {
    $st->close();
}

echo str_replace(
    '%%SCRIPT%%',
    "const WS_URL = ".json_encode($ws_url)."\nconst TOKENS=".json_encode($tokens),
    file_get_contents('template.html')
);
