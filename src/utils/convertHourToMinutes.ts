export default function convertHourToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number)
    const timeInMinutes = (hour * 60) + minute

    return timeInMinutes
}