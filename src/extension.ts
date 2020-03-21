import * as vscode from "vscode";
import { spawnSync } from "child_process";
import commandExists from "command-exists";
import path from "path";

let command = "ocamlformat";

const getFullRange = (document: vscode.TextDocument) => {
  const lastLine = document.lineAt(document.lineCount - 1);
  return new vscode.Range(
    0,
    0,
    document.lineCount - 1,
    lastLine.range.end.character
  );
};

const format = (filename: string, text: string, profile: string) => {
  console.log(filename, text);
  const args = [
    "-",
    `--name=${path.basename(filename)}`,
    "--enable-outside-detected-project",
    `--profile=${profile}`
  ];
  return spawnSync(command, args, {
    input: text,
    encoding: "utf8",
    cwd: path.dirname(filename)
  });
};

export function activate(context: vscode.ExtensionContext) {
  console.log("ocamlformat-vscode is now active!");
  const config = vscode.workspace.getConfiguration("ocamlformat-vscode");
  command = config.get("path") || command;
  const profile: string = config.get("profile") || "janestreet";

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.ocamlformat", () => {
      const { activeTextEditor } = vscode.window;
      if (!activeTextEditor || !commandExists.sync(command)) {
        return;
      }

      const { document } = activeTextEditor;
      const text = document.getText();
      const { stderr, stdout } = format(document.fileName, text, profile);
      if (stderr) {
        return console.error("err", stderr);
      }
      console.log(text, stdout);

      const edit = new vscode.WorkspaceEdit();
      const range = getFullRange(document);
      edit.replace(document.uri, range, stdout);
      return vscode.workspace.applyEdit(edit);
    })
  );

  vscode.languages.registerDocumentFormattingEditProvider("ocaml", {
    provideDocumentFormattingEdits: (
      document: vscode.TextDocument,
      options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> =>
      new Promise((resolve, reject) => {
        const text = document.getText();
        console.log("ocamlformat existence: ", commandExists.sync(command));
        if (!commandExists.sync(command)) {
          return reject(new Error("ocamlformat not in path"));
        }
        const { stderr, stdout } = format(document.fileName, text, profile);
        if (stderr) {
          return reject(stderr);
        }

        const range = getFullRange(document);
        return resolve([vscode.TextEdit.replace(range, stdout)]);
      })
  });
}

export function deactivate() {}
