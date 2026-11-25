import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Shield,
  LogOut,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useModalA11y } from "@/hooks/use-modal-a11y";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, isGuest, signInWithGoogle, signOut, deleteAccountAndData } =
    useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Focus trap, initial focus, escape listener, and body scroll lock
  const { modalContainerRef } = useModalA11y({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleDeleteData = async () => {
    setIsDeleting(true);
    setAuthError(null);
    const { success, error } = await deleteAccountAndData();
    setIsDeleting(false);
    if (success) {
      setShowDeleteConfirm(false);
      onClose();
    } else if (error) {
      setAuthError(error.message);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#111111]/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          aria-describedby={isGuest ? "auth-modal-desc-guest" : "auth-modal-desc-user"}
          tabIndex={-1}
          className="relative w-full max-w-md my-auto transform rounded-2xl border border-[#D6D6D2] bg-white p-4 sm:p-6 text-left shadow-2xl space-y-5 transition-all max-h-[90vh] overflow-y-auto focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D6D6D2] pb-3 sm:pb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDF6D5] text-[#111111]">
                <Shield className="h-4 w-4" />
              </div>
              <h3 id="auth-modal-title" className="text-base font-bold text-[#111111] tracking-tight">
                {isGuest ? "Sign In to VayuVerse" : "Account & Privacy Settings"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#626762] hover:bg-[#FAFAF8] hover:text-[#111111] cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Guest Mode: Sign In options */}
          {isGuest ? (
            <div className="space-y-4 sm:space-y-5">
              <p id="auth-modal-desc-guest" className="text-xs text-[#626762] leading-relaxed">
                Guests can freely select cities, inspect real CAAQMS telemetry, run decision simulations, and receive AI recommendations. Sign in to synchronize your saved plans and impact actions across devices.
              </p>

              {/* Google OAuth Button */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#D6D6D2] bg-white hover:bg-[#FAFAF8] transition-all text-xs font-bold text-[#111111] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#111111]/30"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Privacy Safeguards Footnote */}
              <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-3 text-[11px] text-[#626762] space-y-1">
                <div className="font-bold text-[#111111] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Privacy &amp; Data Safeguards</span>
                </div>
                <p className="leading-relaxed">
                  Saved locations are automatically rounded to ~100m for privacy. We never store exact GPS tracks or medical records.
                </p>
              </div>
            </div>
          ) : (
            /* Signed In Mode: Profile Details & Management */
            <div id="auth-modal-desc-user" className="space-y-4 sm:space-y-5">
              <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-3.5 sm:p-4 space-y-2">
                <div className="text-[11px] text-[#626762] uppercase tracking-wider font-bold">
                  Signed in as
                </div>
                <div className="text-sm font-bold text-[#111111] truncate">
                  {user?.user_metadata?.full_name || user?.email || "Authenticated User"}
                </div>
                <div className="text-xs text-[#626762] font-mono truncate">{user?.email}</div>
              </div>

              {/* Actions Cluster */}
              <div className="space-y-3 pt-1">
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="w-full justify-center gap-2 rounded-xl border-[#D6D6D2] text-xs font-bold text-[#111111] hover:bg-[#FAFAF8] cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-center text-xs text-red-600 hover:text-red-700 py-1 transition-colors cursor-pointer"
                  >
                    Delete my stored data &amp; account
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
                    <div className="text-xs font-bold text-red-900">
                      Are you sure you want to delete all your stored data?
                    </div>
                    <p className="text-[11px] text-red-700 leading-relaxed">
                      This permanently deletes your saved profile, custom locations, plans, and completed action logs from Supabase.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleDeleteData}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex-1 cursor-pointer"
                      >
                        {isDeleting ? "Deleting..." : "Confirm Data Wipe"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="border-[#D6D6D2] text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
