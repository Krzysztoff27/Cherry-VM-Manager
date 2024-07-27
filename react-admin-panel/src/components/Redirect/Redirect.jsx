import { useEffect } from "react";
import { useNavigate } from "react-router-dom"

export default function Redirect({ to }) {
    const navigate = useNavigate();
    useEffect(() => navigate(to), [to])
    return <></>
}
