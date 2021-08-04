<?php
$config = json_decode(file_get_contents('config.json'));
$postText = file_get_contents("php://input"); //POST json
$json = json_decode($postText, false); //stdClass Object ( [id] => 2 [type] => t1 [text] => Hi [link] => https://ya.ru )

//если надо скрипт что-то делает а затем уведомляет node.js процесс о принятом сообщении (пересылает сырьём)

//print_r($json);

$headers = stream_context_create(array(
    'http' => array(
        'method' => 'POST',
        //'header' => 'Content-Type: application/x-www-form-urlencoded' . PHP_EOL,
        'content' => $postText,
    ),
));


file_get_contents(
    sprintf('http://%s:%d', $config->BACKEND->host, $config->BACKEND->port),
    false,
    $headers
);
header('Content-type: application/json');
echo '{"ok":true}';