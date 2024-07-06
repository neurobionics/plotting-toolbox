let traceCount = 1;
const vscode = acquireVsCodeApi();

window.addEventListener("message", (event) => {
	const { data, columns } = event.data;
	initializePlot(data, columns);
});

function initializePlot(dataInput, columnsInput) {
	this.data = dataInput;
	this.columns = columnsInput;
	populateSelectOptions("xColumn1");
	populateSelectOptions("yColumn1");
	updatePlot();
}

function populateSelectOptions(selectId) {
	const select = document.getElementById(selectId);
	select.innerHTML = columns
		.map((col) => `<option value="${col}">${col}</option>`)
		.join("");
}

function addTrace() {
	traceCount++;
	const traceControls = document.getElementById("traceControls");
	const newTraceControl = document.createElement("div");
	newTraceControl.className = "traceControl";
	newTraceControl.innerHTML = `
        <label for="xColumn${traceCount}">X = </label>
        <select id="xColumn${traceCount}"></select>
        <label for="yColumn${traceCount}">Y = </label>
        <select id="yColumn${traceCount}"></select>
        <input type="text" id="label${traceCount}" name="label${traceCount}" placeholder="Enter label">
    `;
	traceControls.appendChild(newTraceControl);
	populateSelectOptions(`xColumn${traceCount}`);
	populateSelectOptions(`yColumn${traceCount}`);
}

function removeTrace() {
	if (traceCount > 1) {
		const traceControls = document.getElementById("traceControls");
		traceControls.lastChild.remove();
		traceCount--;
	}
}

function updatePlot() {
	const plotTitle = document.getElementById("plotTitle").value;
	const xAxisLabel = document.getElementById("xAxisLabel").value;
	const yAxisLabel = document.getElementById("yAxisLabel").value;

	const plotData = Array.from({ length: traceCount }, (_, i) => {
		const xColumn = document.getElementById(`xColumn${i + 1}`).value;
		const yColumn = document.getElementById(`yColumn${i + 1}`).value;
		const label =
			document.getElementById(`label${i + 1}`).value || `Trace ${i + 1}`;
		const x = data.map((row) => row[xColumn]);
		const y = data.map((row) => row[yColumn]);

		return {
			x,
			y,
			type: "scatter",
			mode: "lines",
			name: label,
			line: { color: getRandomColor() },
		};
	});

	const layout = {
		title: plotTitle,
		xaxis: { title: xAxisLabel },
		yaxis: { title: yAxisLabel },
		plot_bgcolor: "#1e1e1e",
		paper_bgcolor: "#1e1e1e",
		font: { color: "#d4d4d4" },
		showlegend: true,
		legend: {
			x: 0.5,
			xanchor: "center",
			y: 1,
			yanchor: "center",
			orientation: "h",
			bordercolor: "#808080",
			borderwidth: 1,
		},
	};

	Plotly.newPlot("plot", plotData, layout);
}

function getRandomColor() {
	const letters = "0123456789ABCDEF";
	return `#${Array.from(
		{ length: 6 },
		() => letters[Math.floor(Math.random() * 16)]
	).join("")}`;
}

function savePlot() {
	Plotly.toImage("plot", {
		format: "png",
		width: 800,
		height: 600,
		scale: 4,
	}).then((url) => {
		vscode.postMessage({ command: "savePlot", data: url });
	});
}
