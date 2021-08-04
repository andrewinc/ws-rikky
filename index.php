<?php
$config = json_decode(file_get_contents('config.json'));
$mysqli = new mysqli($config->DB->host, $config->DB->user, $config->DB->password, $config->DB->database);
if ($code = mysqli_connect_errno()) {
    http_response_code(500);
    echo mysqli_connect_error();
    exit();
}
$token_current = isset($_GET['token']) ? $_GET['token'] : '';

$ws_url = "ws" . ($config->WS->ssl_use?'s':'') . "://{$config->WS->host}:{$config->WS->port}";
if ($token_current) $ws_url .= "/?token=" . $token_current;

$replace = [
    '%%WS_URL%%' => "const WS_URL = ".json_encode($ws_url),
    '%%tokens%%' => '',
    '%%options%%'=> '',
];
$li = [];
$option =[];
$st = $mysqli->prepare("SELECT id, token FROM users");
try{
    if ($st->execute()) {
        $st->bind_result($id, $token);
        while ($st->fetch()) {
            $li[] = sprintf(
                '<li class="%s"><a href="/?token=%s">ID: %d; TOKEN: %s</a></li>',
                ($token_current == $token) ? 'focus' : '',
                $token,
                $id,
                $token
            );
            $option[] = sprintf('<option>%d</option>', $id);
        }
    }
} finally {
    $st->close();
}



$replace['%%tokens%%'] .= join("\n", $li);
$replace['%%options%%'] .= join("\n", $option);
echo str_replace(
    array_keys($replace),
    array_values($replace),
    file_get_contents('template.html')
);
//print_r($config);


//phpinfo();