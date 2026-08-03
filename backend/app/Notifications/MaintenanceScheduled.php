<?php

namespace App\Notifications;

use App\Models\Maintenance;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class MaintenanceScheduled extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Maintenance $maintenance)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'maintenance_scheduled',
            'maintenance_id' => $this->maintenance->id,
            'barang' => $this->maintenance->barang?->nama ?? 'Barang #'.$this->maintenance->barang_id,
            'tanggal_jadwal' => $this->maintenance->tanggal_jadwal,
            'message' => 'Jadwal maintenance baru untuk Anda.',
        ];
    }
}
