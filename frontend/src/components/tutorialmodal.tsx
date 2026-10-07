"use client";

import { tutorialSteps, tutorialTabs, TutorialStepPanel, TutorialWelcome, type TutorialSection } from "@/components/tutorial";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@mantine/core";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function TutorialModal() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [activeTab, setActiveTab] = useState<TutorialSection>("welcome");

    const activeIndex = tutorialTabs.findIndex((tab) => tab.key === activeTab);
    const currentStep = activeTab === "welcome" ? null : tutorialSteps[activeTab];
    const lastIndex = tutorialTabs.length - 1;

    const goToStep = (index: number) => {
        const tab = tutorialTabs[index];
        if (tab) setActiveTab(tab.key);
    };

    const completeTutorial = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from("profiles")
                .update({ tutorial_completed: true })
                .eq("id", user.id);
            if (error) console.error("Error saving tutorial progress:", error);
        }
        router.refresh();
    };

    return (
        <Modal
            opened
            onClose={() => { }}
            closeOnClickOutside={false}
            withCloseButton={false}
            centered
            size="lg"
        >
            {activeTab === "welcome" ? (
                <TutorialWelcome
                    showActions
                    onStart={() => goToStep(1)}
                    onSkip={() => void completeTutorial()}
                />
            ) : currentStep && (
                <TutorialStepPanel
                    icon={tutorialTabs[activeIndex]?.icon ?? Sparkles}
                    {...currentStep}
                    showCta={false}
                    isLast={activeIndex === lastIndex}
                    onBack={() => goToStep(activeIndex - 1)}
                    onNext={() => {
                        if (activeIndex === lastIndex) {
                            void completeTutorial();
                        } else {
                            goToStep(activeIndex + 1);
                        }
                    }}
                />
            )}
        </Modal>
    );
}
