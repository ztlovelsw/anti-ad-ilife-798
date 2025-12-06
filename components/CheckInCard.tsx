'use client';

import {Button, Card, Divider, Flex, Space, Statistic, Tag, Typography, message} from "antd";
import React, {useEffect, useMemo, useState} from "react";
import {deserializeFromLocalStorage} from "@/utils/Serializable";

const {Text, Title} = Typography;

type Local = {
    al: {
        token: string
    }
}

type CheckInCardProps = {
    base_url: string
}

type SignStatus = {
    signedToday: boolean,
    streak: number,
    todayPoints: number,
    totalPoints: number,
    lastSignAt?: string
}

const defaultStatus: SignStatus = {
    signedToday: false,
    streak: 0,
    todayPoints: 0,
    totalPoints: 0,
}

// 兼容后端字段的状态解析
function normalizeStatus(data: any): SignStatus {
    return {
        signedToday: Boolean(data?.signedToday ?? data?.signed ?? data?.todaySigned ?? data?.isSigned ?? false),
        streak: Number(data?.streak ?? data?.continueDays ?? data?.serial ?? data?.continuous ?? 0) || 0,
        todayPoints: Number(data?.todayPoints ?? data?.todayScore ?? data?.award ?? data?.score ?? 0) || 0,
        totalPoints: Number(data?.totalPoints ?? data?.totalScore ?? data?.points ?? data?.sum ?? 0) || 0,
        lastSignAt: data?.lastSignAt ?? data?.latestDate ?? data?.lastSignDate,
    }
}

export default function CheckInCard({base_url}: CheckInCardProps) {
    const [status, setStatus] = useState<SignStatus>(defaultStatus)
    const [loading, setLoading] = useState(false)
    const [statusLoading, setStatusLoading] = useState(false)
    const [rawMessage, setRawMessage] = useState<string>("")
    const [messageApi, contextHolder] = message.useMessage()

    const token = useMemo(() => {
        const storage = deserializeFromLocalStorage<Local>("data")
        return storage?.al?.token ?? ""
    }, [])

    const fetchStatus = () => {
        if (!token) {
            return
        }
        setStatusLoading(true)
        fetch(`${base_url}/api/v1/score/sign/status`, {
            method: "GET",
            headers: {
                "Connection": "keep-alive",
                "ApplicationType": "1,1",
                "Accept": "*/*",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Html5Plus/1.0 (Immersed/20) uni-app",
                "Authorization": token,
                "Accept-Language": "zh-TW,zh-Hant;q=0.9",
                "Accept-Encoding": "gzip, deflate, br"
            }
        })
            .then(async res => {
                const json = await res.json()
                setRawMessage(JSON.stringify(json))
                if (json?.data) {
                    setStatus(normalizeStatus(json.data))
                }
            })
            .catch(err => {
                console.error(err)
                messageApi.error("获取签到状态失败，请稍后重试")
            })
            .finally(() => setStatusLoading(false))
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    const handleCheckIn = () => {
        if (!token) {
            messageApi.warning("未找到登录状态，请重新登录后再试")
            return
        }
        setLoading(true)
        fetch(`${base_url}/api/v1/score/sign`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Connection": "keep-alive",
                "ApplicationType": "1,1",
                "Accept": "*/*",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Html5Plus/1.0 (Immersed/20) uni-app",
                "Authorization": token,
                "Accept-Language": "zh-TW,zh-Hant;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
            },
            body: JSON.stringify({})
        })
            .then(async res => {
                const json = await res.json()
                setRawMessage(JSON.stringify(json))
                if (json.code === 0) {
                    messageApi.success(json.msg ?? "签到成功")
                    if (json?.data) {
                        setStatus(normalizeStatus(json.data))
                    } else {
                        setStatus(prev => ({...prev, signedToday: true}))
                    }
                } else if (json.code === -2) {
                    messageApi.warning(json.msg ?? "今天已经签到过啦")
                    if (json?.data) {
                        setStatus(normalizeStatus(json.data))
                    }
                } else {
                    messageApi.error(json.msg ?? "签到失败，请稍后重试")
                }
            })
            .catch(err => {
                console.error(err)
                messageApi.error("签到失败，请检查网络后重试")
            })
            .finally(() => setLoading(false))
    }

    return (
        <Card title={<Title level={4}>签到领积分</Title>} className={"mx-4 mb-4"}>
            {contextHolder}
            <Space direction="vertical" className={"w-full"} size={12}>
                <Flex gap={12} wrap>
                    <Statistic title="今日积分" value={status.todayPoints} suffix="分" loading={statusLoading}/>
                    <Statistic title="总积分" value={status.totalPoints} suffix="分" loading={statusLoading}/>
                    <Statistic title="连续签到" value={status.streak} suffix="天" loading={statusLoading}/>
                </Flex>
                <Flex align="center" gap={8}>
                    <Tag color={status.signedToday ? "blue" : "red"}>
                        {status.signedToday ? "今日已签到" : "今日未签到"}
                    </Tag>
                    {status.lastSignAt && <Text type="secondary">上次签到：{status.lastSignAt}</Text>}
                </Flex>
                <Button
                    type="primary"
                    size={"large"}
                    onClick={handleCheckIn}
                    loading={loading}
                    disabled={status.signedToday}
                >
                    {status.signedToday ? "今日已完成" : "立即签到"}
                </Button>
                <Divider className={"my-2"}/>
                <div className={"bg-gray-50 p-3 rounded text-xs text-gray-500 break-all"}>
                    <Text>最近响应：</Text>
                    <div>{rawMessage || "尚未获取"}</div>
                </div>
            </Space>
        </Card>
    )
}
