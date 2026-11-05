export function tester(req, res) {
    console.log("test");
    res.status(200).json({ message: "API is running"});
}