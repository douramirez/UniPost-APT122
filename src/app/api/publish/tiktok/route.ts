import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const CREATOR_INFO = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
const INIT_ENDPOINT = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const COMPLETE_ENDPOINT = "https://open.tiktokapis.com/v2/post/publish/video/complete/";

export async function POST(req: NextRequest) {
  try {
    const { userId, videoUrl, caption } = await req.json();

    if (!userId || !videoUrl) {
      return NextResponse.json({ error: "Missing userId or videoUrl" }, { status: 400 });
    }

    const tokenDB = await prisma.tikTok_Access.findFirst({
      where: { userId: Number(userId), redSocial: 4 },
    });
    if (!tokenDB) {
      return NextResponse.json({ error: "TikTok not linked for this user" }, { status: 400 });
    }

    const accessToken = decrypt(tokenDB.accessToken);

    // 1️⃣ CREATOR INFO REQUIREMENT
    const creatorInfo = await fetch(CREATOR_INFO, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }).then(r => r.json());

    if (creatorInfo?.error?.code !== "ok") {
      console.error("CREATOR INFO ERROR:", creatorInfo);
      return NextResponse.json({ error: "Creator info failed" }, { status: 400 });
    }

    // 2️⃣ DOWNLOAD VIDEO
    const videoRes = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const size = videoBuffer.length;

    console.log("VIDEO SIZE:", size);

    // 3️⃣ INIT REQUEST — MUST FOLLOW TIKTOK DOC EXACTLY
    const initBody = {
      post_info: {
        title: caption ?? "",
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: size,        // Upload whole file in one PUT
        total_chunk_count: 1
      }
    };

    const initRes = await fetch(INIT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initBody),
    });

    const initData = await initRes.json();

    if (initData.error?.code !== "ok") {
      console.error("TikTok INIT ERROR:", initData);
      return NextResponse.json({ error: "TikTok INIT failed", details: initData }, { status: 400 });
    }

    const uploadUrl = initData.data.upload_url;
    const publishId = initData.data.publish_id;

    // 4️⃣ UPLOAD VIDEO
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes 0-${size - 1}/${size}`,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      return NextResponse.json({ error: "Upload failed" }, { status: 400 });
    }

    // 5️⃣ COMPLETE POST
    const completeRes = await fetch(COMPLETE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    const completeData = await completeRes.json();

    if (completeData.error?.code !== "ok") {
      console.error("TikTok COMPLETE ERROR:", completeData);
      return NextResponse.json({ error: "Publish failed", details: completeData }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Video published to TikTok!",
      data: completeData.data
    });

  } catch (err: any) {
    console.error("🔥 TikTok Publish Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
