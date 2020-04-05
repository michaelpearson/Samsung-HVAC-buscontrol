export default class RadioButton {
    private readonly callback: (mode: string) => void;
    private readonly elements: NodeListOf<HTMLElement>;
    private readonly attributeName: string;

    constructor(elements: NodeListOf<HTMLElement>, attributeName: string, callback: (mode: string) => void) {
        this.elements = elements;
        this.callback = callback;
        this.attributeName = attributeName;
        elements.forEach((e, i) => e.addEventListener('click', this.click.bind(this, e, i, false)))
    }

    private click(element: HTMLElement, index: number, internal: boolean = false) {
        this.elements.forEach((e, i) => {
            if (i == index && !e.classList.contains('selected')) {
                e.classList.add('selected')
            }
            if (i != index) {
                e.classList.remove('selected')
            }
        });
        if (!internal) {
            this.callback(element.getAttribute(this.attributeName));
        }
    }

    public setValue(value: string | number) {
        if (typeof value == "string") {
            this.elements.forEach((e, i) => {
                if (e.getAttribute(this.attributeName) === value) {
                    this.click(e, i, true);
                }
            });
        }
        if (typeof value == "number") {
            this.click(this.elements.item(value), value, true);
        }
    }
}