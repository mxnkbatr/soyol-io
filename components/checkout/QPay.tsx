"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Loader2,
  CheckCircle2,
  QrCode,
  ExternalLink,
  RefreshCcw,
  Clock,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { openExternalLink } from "@/lib/openExternalLink";

interface QPayProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
}

interface QPayData {
  invoiceId: string;
  qrText: string;
  qrImage: string;
  urls: { name: string; description: string; logo: string; link: string }[];
}

export default function QPay({ orderId, amount, onSuccess }: QPayProps) {
  const [loading, setLoading] = useState(true);
  const [qpayData, setQpayData] = useState<QPayData | null>(null);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initiatePayment();

     // Make sure the QR view is visible (mobile sometimes keeps prior scroll position).
    rootRef.current?.scrollIntoView({ block: "start" });

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timer);
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const initiatePayment = async () => {
    try {
      const res = await fetch("/api/payment/qpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          description: `Захиалга #${orderId.slice(-6)}`,
        }),
      });

      const data = await res.json().catch(() => null as any);
      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string"
            ? (data as any).error
            : "Invoice creation failed");
        throw new Error(msg);
      }
      setQpayData(data);
      setLoading(false);

      // Start Polling
      startPolling(data.invoiceId);
    } catch (error) {
     const msg = error instanceof Error ? error.message : "QPay холболт амжилтгүй боллоо";
      toast.error(msg);
      setLoading(false);
    }
  };

  const startPolling = (invoiceId: string) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    pollingInterval.current = setInterval(() => {
      checkStatus(invoiceId, true);
    }, 5000); // Every 5 seconds
  };

  const checkStatus = async (invoiceId: string, silent = false) => {
    if (!silent) setChecking(true);
    try {
      const res = await fetch(`/api/payment/qpay/check/${invoiceId}`);
      const data = await res.json();

      if (data.paid) {
        handleSuccess();
      } else if (!silent) {
        toast.error("Төлбөр хараахан хийгдээгүй байна");
      }
    } catch (error) {
      console.error("Polling error", error);
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const handleSuccess = () => {
    setPaid(true);
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF4500", "#FF6B00", "#ffffff"],
    });

    setTimeout(() => {
      onSuccess();
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const openPaymentLink = async (url?: string) => {
    if (!url) {
      toast.error("Линк олдсонгүй");
      return;
    }

    const result = await openExternalLink(url);
    if (!result.ok) {
      console.error("Failed to open payment link:", result.error);
      toast.error("Апп нээхэд алдаа гарлаа");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-slate-900 border border-white/10 rounded-3xl">
        <Loader2 className="w-10 h-10 text-[#FF4500] animate-spin" />
        <p className="text-slate-400 font-medium">
          QPay QR код үүсгэж байна...
        </p>
      </div>
    );
  }

  if (paid) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 space-y-6 bg-slate-900 border border-emerald-500/30 rounded-3xl text-center"
      >
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white">Төлбөр амжилттай!</h3>
          <p className="text-slate-400">
            Таны захиалга баталгаажлаа. Түр хүлээнэ үү...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
   <div ref={rootRef} className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-md mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center shadow-lg shadow-[#FF4500]/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">QPay Төлбөр</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Secure Payment
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-full border border-white/5">
          <Clock className="w-3.5 h-3.5 text-[#FF4500]" />
          <span className="text-xs font-mono font-bold text-slate-300">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* QR Code */}
        <div className="relative group mx-auto w-64 h-64 p-4 bg-white rounded-2xl shadow-xl overflow-hidden">
          <img
            src={`data:image/png;base64,${qpayData?.qrImage}`}
            alt="QPay QR"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 border-4 border-slate-900/5 rounded-2xl pointer-events-none" />

          <AnimatePresence>
            {checking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3"
              >
                <RefreshCcw className="w-8 h-8 text-[#FF4500] animate-spin" />
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                  Шалгаж байна
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center space-y-1">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Төлөх дүн
          </p>
          <p className="text-3xl font-black text-white">
            {amount.toLocaleString()}₮
          </p>
        </div>

        {/* Banking App Links */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
            Банкны апп-аар нээх
          </p>
          <div className="grid grid-cols-4 gap-3">
            {qpayData?.urls.slice(0, 8).map((app, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openPaymentLink(app.link)}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 p-2 group-hover:border-[#FF4500]/50 transition-all group-hover:scale-105 overflow-hidden">
                  <img
                    src={app.logo}
                    alt={app.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center">
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => checkStatus(qpayData!.invoiceId)}
            disabled={checking}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-95"
          >
            <RefreshCcw
              className={`w-4 h-4 ${checking ? "animate-spin" : ""}`}
            />
            Төлбөр шалгах
          </button>
          <button
            onClick={() => openPaymentLink(qpayData?.urls[0]?.link)}
            className="flex-1 py-4 bg-[#FF4500] hover:bg-[#CC3700] rounded-full flex items-center justify-center gap-2 text-sm font-bold text-white transition-all shadow-lg shadow-[#FF4500]/20 active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            Апп нээх
          </button>
        </div>
      </div>

      <div className="px-8 py-5 bg-slate-950 border-t border-white/5 flex items-center justify-center gap-3">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center"
            >
              <CreditCard className="w-3 h-3 text-slate-500" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
          All major Mongolian banks supported
        </p>
      </div>
    </div>
  );
}
