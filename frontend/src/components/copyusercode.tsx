"use client";

import { Badge, CopyButton, Tooltip } from "@mantine/core";
import { Check, Copy } from "lucide-react";

export default function CopyUserCode({ userCode }: { userCode: string }) {
    return (
        <CopyButton value={userCode}>
            {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy user code"} withArrow>
                    <Badge
                        variant='light'
                        color={copied ? 'green' : 'blue'}
                        onClick={copy}
                        style={{ cursor: 'pointer' }}
                        leftSection={
                            copied ? <Check size={13} /> : <Copy size={13} style={{ cursor: "pointer" }} />
                        }
                        size="lg"
                        radius='xl'
                    >
                        {copied ? 'Copied' : userCode}
                    </Badge>
                </Tooltip>
            )
            }
        </CopyButton >
    );
}