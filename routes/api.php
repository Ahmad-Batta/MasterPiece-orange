<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CandidateController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\PaymentController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->name('api.login');
Route::post('/register', [AuthController::class, 'register'])->name('api.register');
Route::get('/auth/google/redirect', [AuthController::class, 'googleRedirect'])->name('api.auth.google.redirect');
Route::get('/auth/google/callback', [AuthController::class, 'googleCallback'])->name('api.auth.google.callback');
Route::get('/jobs', [JobController::class, 'index'])->name('api.jobs.index');
Route::get('/plans', [PaymentController::class, 'plans'])->name('api.plans.index');
Route::post('/payments/webhook', [PaymentController::class, 'webhook'])->name('api.payments.webhook');
Route::get('/payments/demo-checkout/{paymentId}', [PaymentController::class, 'demoCheckout'])
    ->middleware('signed')->name('api.payments.demo.checkout');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/me', [AuthController::class, 'me'])->name('api.me');

    Route::middleware('role:seeker,company')->group(function (): void {
        Route::post('/payments/checkout', [PaymentController::class, 'checkout'])->name('api.payments.checkout');
        Route::get('/payments/history', [PaymentController::class, 'history'])->name('api.payments.history');
        Route::post('/payments/demo-confirm/{paymentId}', [PaymentController::class, 'confirmDemo'])->name('api.payments.demo.confirm');
    });

    Route::middleware('role:seeker')->group(function (): void {
        Route::post('/jobs/{id}/apply', [JobController::class, 'apply']);

        Route::prefix('seeker')->group(function (): void {
            Route::get('/profile', [CandidateController::class, 'profile']);
            Route::put('/profile', [CandidateController::class, 'updateProfile']);
            Route::post('/cv', [CandidateController::class, 'uploadResume']);
            Route::get('/recommendations', [CandidateController::class, 'recommendations']);
            Route::get('/applications', [CandidateController::class, 'applications']);
        });
    });

    Route::middleware('role:company')->prefix('company')->group(function (): void {
        Route::get('/profile', [CompanyController::class, 'profile']);
        Route::put('/profile', [CompanyController::class, 'updateProfile']);
        Route::post('/verify-request', [CompanyController::class, 'requestVerification']);
        Route::get('/jobs', [CompanyController::class, 'indexJobs']);
        Route::post('/jobs', [CompanyController::class, 'storeJob']);
        Route::put('/jobs/{id}', [CompanyController::class, 'updateJob']);
        Route::patch('/jobs/{id}', [CompanyController::class, 'updateJob']);
        Route::delete('/jobs/{id}', [CompanyController::class, 'deleteJob']);
        Route::get('/jobs/{id}/applicants', [CompanyController::class, 'applicants']);
        Route::patch('/applications/{id}/status', [CompanyController::class, 'updateApplicationStatus']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/payments', [PaymentController::class, 'adminIndex']);
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/verifications', [AdminController::class, 'verifications']);
        Route::patch('/companies/{id}/verify', [AdminController::class, 'verifyCompany']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{role}/{id}', [AdminController::class, 'deactivateUser'])->whereIn('role', ['admin', 'seeker', 'company']);
        Route::get('/job-posts', [AdminController::class, 'jobPosts']);
        Route::put('/job-posts/{id}', [AdminController::class, 'updateJobPost']);
        Route::patch('/job-posts/{id}', [AdminController::class, 'updateJobPost']);
        Route::delete('/job-posts/{id}', [AdminController::class, 'removeJobPost']);
        Route::get('/categories', [AdminController::class, 'categories']);
        Route::post('/categories', [AdminController::class, 'createCategory']);
        Route::put('/categories/{id}', [AdminController::class, 'updateCategory']);
        Route::patch('/categories/{id}', [AdminController::class, 'updateCategory']);
        Route::delete('/categories/{id}', [AdminController::class, 'deleteCategory']);
        Route::get('/jobs', [AdminController::class, 'jobs']);
        Route::post('/jobs', [AdminController::class, 'createJob']);
        Route::put('/jobs/{id}', [AdminController::class, 'updateJob']);
        Route::patch('/jobs/{id}', [AdminController::class, 'updateJob']);
        Route::delete('/jobs/{id}', [AdminController::class, 'deleteJob']);
    });
});
