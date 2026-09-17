import WelcomeRewardModal from "@/components/welcomerewardmodal";
import { createClient } from "@/lib/supabase/server";
import { Container, Image, Paper } from "@mantine/core";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase.from("profiles").select("new_user_reward_claimed").eq("id", user.id).single();
    const { data: pet } = await supabase.from("pets").select("*").eq("owner_id", user.id).maybeSingle();
    const showReward = !profile?.new_user_reward_claimed;

    return (
        <Container mih="100vh" p={{ base: 20, md: 40 }} miw='100%' style={{ backgroundColor: "#F7F9FC" }}>
            <Paper>
                {pet?.species && (
                    <Image
                        src={`/assets/starter-pets/${pet.species}.png`}
                        alt={pet.name}
                        w={300}
                        h={300}
                    />
                )}
                {showReward && <WelcomeRewardModal />}
            </Paper>
        </Container>
    );
}