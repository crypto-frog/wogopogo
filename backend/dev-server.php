<?php
// Local development router.
// Run from the project root:  php -S 127.0.0.1:8000 backend/dev-server.php
// Every request is handed to the API front controller, which reads the
// route from the URL, so /api/jobs etc. behave exactly like production.
require __DIR__ . '/api/index.php';
