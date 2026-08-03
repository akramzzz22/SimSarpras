<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // NB: frontend authenticates with Sanctum Bearer tokens (not cookie sessions),
        // so statefulApi() is intentionally NOT enabled to avoid CSRF on API requests.

        // Override Laravel's default guest redirect (route('login')) which throws
        // RouteNotFoundException on this API-only app; JSON response is decided below.
        $middleware->redirectGuestsTo('/');

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API-only app: always return JSON for API routes (e.g. 401 on unauthenticated)
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
