let traceCount = 1;

const vscode = acquireVsCodeApi();

window.addEventListener("message", (event) => {
	const message = event.data;
	const data = message.data;
	const columns = message.columns;
	initializePlot(data, columns);
});

function initializePlot(dataInput, columnsInput) {
	data = dataInput;
	columns = columnsInput;
	populateSelectOptions("xColumn1");
	populateSelectOptions("yColumn1");
	updatePlot(data);
}

function populateSelectOptions(selectId) {
	const select = document.getElementById(selectId);
	columns.forEach((col) => {
		const option = document.createElement("option");
		option.value = col;
		option.text = col;
		select.appendChild(option);
	});
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
		traceControls.removeChild(traceControls.lastChild);
		traceCount--;
	}
}

function updatePlot() {
	const plotTitle = document.getElementById("plotTitle").value;
	const xAxisLabel = document.getElementById("xAxisLabel").value;
	const yAxisLabel = document.getElementById("yAxisLabel").value;

	const plotData = [];
	for (let i = 1; i <= traceCount; i++) {
		const xColumn = document.getElementById("xColumn" + i).value;
		const yColumn = document.getElementById("yColumn" + i).value;
		const label =
			document.getElementById("label" + i).value || `Trace ${i}`;
		const x = data.map((row) => row[xColumn]);
		const y = data.map((row) => row[yColumn]);
		plotData.push({
			x: x,
			y: y,
			type: "scatter",
			mode: "lines",
			name: label, // Use the label for the legend
			line: { color: getRandomColor() },
		});
	}
	const layout = {
		title: plotTitle,
		xaxis: {
			title: xAxisLabel,
		},
		yaxis: {
			title: yAxisLabel,
		},
		plot_bgcolor: "#1e1e1e",
		paper_bgcolor: "#1e1e1e",
		font: {
			color: "#d4d4d4",
		},
	};
	Plotly.newPlot("plot", plotData, layout);
}

function getRandomColor() {
	const letters = "0123456789ABCDEF";
	let color = "#";
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function savePlot() {
	Plotly.toImage("plot", {
		format: "png",
		width: 800,
		height: 600,
		scale: 4,
	}).then(function (url) {
		vscode.postMessage({
			command: "savePlot",
			data: url,
		});
	});
}
