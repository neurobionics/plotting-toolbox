import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse } from "csv-parse/sync";
let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("plottingToolbox.plot", () => {
			openPlottingPanel(context);
		})
	);

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		updateDataAndColumns(context);
	});
}

function updateDataAndColumns(context: vscode.ExtensionContext) {
	const editor = vscode.window.activeTextEditor;

	let data: any[] = [];
	let columns: string[] = [];

	if (editor) {
		const document = editor.document;
		const fileName = document.fileName;

		if (!fileName.endsWith(".csv")) {
			vscode.window.showErrorMessage("Please open a CSV file to plot");
			return;
		} else {
			data = getDataFromCSV(fileName);
			columns = getColumnsFromData(data);
			context.globalState.update("plottingToolbox.data", data);
			context.globalState.update("plottingToolbox.columns", columns);
		}
	} else {
		data = context.globalState.get("plottingToolbox.data", []);
		columns = context.globalState.get("plottingToolbox.columns", []);
	}

	if (!data || !columns || data.length === 0 || columns.length === 0) {
		vscode.window.showErrorMessage("No data found in the CSV file");
		return;
	}

	if (panel) {
		panel.webview.postMessage({ data, columns });
	}
}

function openPlottingPanel(context: vscode.ExtensionContext) {
	if (panel) {
		panel.reveal(vscode.ViewColumn.One);
		return;
	}

	panel = vscode.window.createWebviewPanel(
		"plottingToolbox",
		"Plotting Toolbox",
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.file(path.join(context.extensionPath, "media")),
			],
		}
	);

	const htmlPath = vscode.Uri.file(
		path.join(context.extensionPath, "media", "webview.html")
	);
	const cssPath = panel.webview.asWebviewUri(
		vscode.Uri.file(path.join(context.extensionPath, "media", "style.css"))
	);
	const jsPath = panel.webview.asWebviewUri(
		vscode.Uri.file(path.join(context.extensionPath, "media", "script.js"))
	);

	let html = fs.readFileSync(htmlPath.fsPath, "utf8");
	html = html.replace('href="style.css"', `href="${cssPath}"`);
	html = html.replace('src="script.js"', `src="${jsPath}"`);

	panel.webview.html = html;
	panel.webview.onDidReceiveMessage((message) => {
		switch (message.command) {
			case "savePlot":
				vscode.window
					.showSaveDialog({
						defaultUri: vscode.Uri.file(
							path.join(
								vscode.workspace.rootPath || "",
								"plot.png"
							)
						),
						filters: {
							Images: ["png"],
						},
					})
					.then((uri) => {
						if (uri) {
							savePlot(message.data, uri.fsPath);
						}
					});
				break;
		}
	});
	updateDataAndColumns(context);

	panel.onDidDispose(() => {
		panel = undefined;
	});
}

function getDataFromCSV(fileName: string): any[] {
	const csvContent = fs.readFileSync(fileName, "utf8");
	const records = parse(csvContent, {
		columns: true,
		skip_empty_lines: true,
	});
	return records;
}

function getColumnsFromData(data: any[]): string[] {
	if (data.length === 0) {
		return [];
	}
	return Object.keys(data[0]);
}

function savePlot(data: string, fileName: string = "plot.png") {
	data = data.replace(/^data:image\/png;base64,/, "");
	// Write the binary data to the file
	fs.writeFile(fileName, data, "base64", function (err) {
		console.log(err);
	});
}
