"use client";

import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import useMeasure from "react-use-measure";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BannedIcon,
  DangerIcon,
  FaceIDIcon,
  LockIcon,
  PassIcon,
  PhraseIcon,
  RecoveryPhraseIcon,
  ShieldIcon,
  WarningIcon,
} from "@/components/ui/animated-drawer-utils/demo-icons";

type DrawerView = "default" | "key" | "phrase" | "remove";

export const AnimatedDrawer = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [view, setView] = useState<DrawerView>("default");
  const [elementRef, bounds] = useMeasure();
  const prefersReducedMotion = useReducedMotion();

  // Reset to the root view once the close animation has finished, so reopening
  // never lands the user mid-flow on a destructive screen.
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      window.setTimeout(() => setView("default"), 300);
    }
  };

  const closeButton = (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Close wallet settings"
      className="size-11 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
      onClick={() => handleOpenChange(false)}
    >
      <X aria-hidden="true" className="text-neutral-600 dark:text-neutral-400" size={18} />
    </Button>
  );

  const safetyList = (
    <div className="space-y-5 border-t border-neutral-200 pt-5 text-lg text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      <div className="flex items-center gap-4">
        <ShieldIcon />
        <h3>Store it in a secure location</h3>
      </div>
      <div className="flex items-center gap-4">
        <PhraseIcon />
        <h3>Never share with anyone</h3>
      </div>
      <div className="flex items-center gap-4">
        <BannedIcon />
        <h3>We cannot recover it for you</h3>
      </div>
    </div>
  );

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return (
          <div>
            <div className="flex w-full items-center justify-between">
              <Drawer.Title className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                Wallet Settings
              </Drawer.Title>
              {closeButton}
            </div>
            <Drawer.Description className="sr-only">
              View your private key or recovery phrase, or remove this wallet.
            </Drawer.Description>

            <div className="mt-6 flex flex-col items-start gap-4">
              <button
                onClick={() => setView("key")}
                className="flex w-full items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3.5 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
              >
                <LockIcon />
                View Private Key
              </button>
              <button
                onClick={() => setView("phrase")}
                className="flex w-full items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3.5 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
              >
                <PassIcon />
                View Recovery Phrase
              </button>
              <button
                onClick={() => setView("remove")}
                className="flex w-full items-center gap-2 rounded-2xl bg-red-50 px-4 py-3.5 font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <WarningIcon />
                Remove Wallet
              </button>
            </div>
          </div>
        );

      case "remove":
        return (
          <div className="space-y-4">
            <div className="flex justify-between">
              <DangerIcon />
              {closeButton}
            </div>
            <Drawer.Title className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
              Remove Wallet?
            </Drawer.Title>
            <Drawer.Description className="text-lg font-light text-neutral-500 dark:text-neutral-400">
              This action cannot be undone. Make sure you&apos;ve backed up your
              recovery phrase before proceeding. You&apos;ll lose access to all
              funds if you don&apos;t have a backup.
            </Drawer.Description>
            <div className="flex items-center justify-start gap-4">
              <Button
                onClick={() => setView("default")}
                className="h-12 w-36 rounded-3xl bg-neutral-200 text-lg text-neutral-900 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setView("default")}
                className="h-12 w-36 rounded-3xl bg-red-500 text-lg text-white transition-colors hover:bg-red-600"
              >
                Remove
              </Button>
            </div>
          </div>
        );

      case "phrase":
      case "key": {
        const isPhrase = view === "phrase";
        return (
          <div className="space-y-4">
            <div className="flex justify-between">
              <RecoveryPhraseIcon />
              {closeButton}
            </div>
            <Drawer.Title className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
              {isPhrase ? "Recovery Phrase" : "Private Key"}
            </Drawer.Title>
            <Drawer.Description className="text-lg font-light text-neutral-500 dark:text-neutral-400">
              {isPhrase
                ? "Your recovery phrase is the master key to your wallet. Write it down and store it securely. Anyone with this phrase can access your funds."
                : "Your private key is a cryptographic key that proves ownership of your wallet. Treat it with the same security as your bank account details."}
            </Drawer.Description>
            {safetyList}
            <div className="flex items-center justify-start gap-4">
              <Button
                onClick={() => setView("default")}
                className="h-12 w-36 rounded-3xl bg-neutral-200 text-lg text-neutral-900 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setView("default")}
                className="flex h-12 w-42 items-center gap-3 rounded-3xl bg-sky-400 text-lg text-white transition-colors hover:bg-sky-500"
              >
                <FaceIDIcon />
                {isPhrase ? "Show Phrase" : "Show Key"}
              </Button>
            </div>
          </div>
        );
      }
    }
  }, [view]);

  return (
    <>
      <Button
        className="mt-5 rounded-full border border-neutral-200 bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
        onClick={() => setIsOpen(true)}
      >
        Click Me To Open Drawer
      </Button>

      <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[361px] overflow-hidden rounded-[36px] bg-white outline-hidden md:mx-auto md:w-full dark:bg-neutral-900">
            <motion.div
              animate={{ height: bounds.height || "auto" }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 400, damping: 40 }
              }
            >
              <div className="p-6" ref={elementRef}>
                {content}
              </div>
            </motion.div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default AnimatedDrawer;
