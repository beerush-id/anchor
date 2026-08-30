/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { act } from 'react';
import { For } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  ColorPicker,
  DatePicker,
  DateTimePicker,
  Field,
  FieldList,
  FilePicker,
  Form,
  FormReset,
  NumberInput,
  Radio,
  Select,
  Slider,
  Textarea,
  TextInput,
  TimePicker,
} from '../src/index.js';

afterEach(cleanup);

describe('NumberInput', () => {
  const schema = z.object({ age: z.number().min(0) });

  it('should render a number input with value', () => {
    render(() => (
      <Form schema={schema} value={{ age: 25 }}>
        <Field name="age">
          <NumberInput data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.value).toBe('25');
  });

  it('should update on input and settle on blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ age: 25 }}>
        <Field name="age">
          <NumberInput data-testid="input" onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: '30' } });
    expect((input as HTMLInputElement).value).toBe('30');
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('DatePicker', () => {
  const schema = z.object({ birthday: z.date() });

  it('should render a date input', () => {
    render(() => (
      <Form schema={schema} value={{ birthday: new Date('2000-01-15') }}>
        <Field name="birthday">
          <DatePicker data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('date');
    expect(input.value).toBe('2000-01-15');
  });

  it('should update on input and settle on blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ birthday: new Date('2000-01-15') }}>
        <Field name="birthday">
          <DatePicker data-testid="input" onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: '2024-06-01' } });
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('DateTimePicker', () => {
  const schema = z.object({ event: z.date() });

  it('should render a datetime-local input', () => {
    render(() => (
      <Form schema={schema} value={{ event: new Date('2024-06-15T14:30') }}>
        <Field name="event">
          <DateTimePicker data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('datetime-local');
    expect(input.value).toContain('2024-06-15');
  });

  it('should call user handlers on input and blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ event: new Date('2024-06-15T14:30') }}>
        <Field name="event">
          <DateTimePicker data-testid="input" onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: '2024-07-01T10:00' } });
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('TimePicker', () => {
  const schema = z.object({ alarm: z.date() });

  it('should render a time input', () => {
    render(() => (
      <Form schema={schema} value={{ alarm: new Date('2024-01-01T08:30') }}>
        <Field name="alarm">
          <TimePicker data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('time');
    expect(input.value).toBe('08:30');
  });

  it('should call user handlers on input and blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ alarm: new Date('2024-01-01T08:30') }}>
        <Field name="alarm">
          <TimePicker data-testid="input" onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: '09:00' } });
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('ColorPicker', () => {
  const schema = z.object({ color: z.string() });

  it('should render a color input', () => {
    render(() => (
      <Form schema={schema} value={{ color: '#ff0000' }}>
        <Field name="color">
          <ColorPicker data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('color');
    expect(input.value).toBe('#ff0000');
  });

  it('should call user handlers on input and blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ color: '#ff0000' }}>
        <Field name="color">
          <ColorPicker data-testid="input" onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: '#00ff00' } });
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('Slider', () => {
  const schema = z.object({ volume: z.number() });

  it('should render a range input', () => {
    render(() => (
      <Form schema={schema} value={{ volume: 50 }}>
        <Field name="volume">
          <Slider data-testid="input" min={0} max={100} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('range');
    expect(input.value).toBe('50');
  });

  it('should update on input and settle on blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ volume: 50 }}>
        <Field name="volume">
          <Slider data-testid="input" min={0} max={100} onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: '75' } });
    expect((input as HTMLInputElement).value).toBe('75');
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('Radio', () => {
  const schema = z.object({ plan: z.string() });

  it('should render radio inputs with correct checked state', () => {
    render(() => (
      <Form schema={schema} value={{ plan: 'pro' }}>
        <Field name="plan">
          <Radio data-testid="free" value="free" />
          <Radio data-testid="pro" value="pro" />
        </Field>
      </Form>
    ));

    expect((screen.getByTestId('free') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('pro') as HTMLInputElement).checked).toBe(true);
  });

  it('should toggle selection and call user onChange', async () => {
    const handleChange = vi.fn();

    render(() => (
      <Form schema={schema} value={{ plan: 'pro' }}>
        <Field name="plan">
          <Radio data-testid="free" value="free" onChange={handleChange} />
          <Radio data-testid="pro" value="pro" />
        </Field>
      </Form>
    ));

    fireEvent.click(screen.getByTestId('free'));

    expect((screen.getByTestId('free') as HTMLInputElement).checked).toBe(true);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should apply error class when touched and invalid', () => {
    const errorSchema = z.object({ plan: z.string().min(5) });

    render(() => (
      <Form schema={errorSchema} value={{ plan: 'pro' }}>
        <Field name="plan">
          <Radio data-testid="free-err" value="free" errorClass="radio-err" />
          <Radio data-testid="pro-err" value="pro" errorClass="radio-err" />
        </Field>
      </Form>
    ));

    const free = screen.getByTestId('free-err');
    fireEvent.click(free);
    expect(free.className).toContain('radio-err');
  });

  it('should fallback to default options when errorClass is omitted', () => {
    const errorSchema = z.object({ plan: z.string().min(5) });
    render(() => (
      <Form schema={errorSchema} value={{ plan: 'pro' }}>
        <Field name="plan">
          <Radio data-testid="free-fallback" value="free" />
        </Field>
      </Form>
    ));
    fireEvent.click(screen.getByTestId('free-fallback'));
  });
});

describe('Select', () => {
  const schema = z.object({ country: z.string() });

  it('should render a select with value', () => {
    render(() => (
      <Form schema={schema} value={{ country: 'uk' }}>
        <Field name="country">
          <Select data-testid="select">
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
          </Select>
        </Field>
      </Form>
    ));

    const select = screen.getByTestId('select') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('uk');
  });

  it('should update on change and call user onChange', async () => {
    const handleChange = vi.fn();

    render(() => (
      <Form schema={schema} value={{ country: 'uk' }}>
        <Field name="country">
          <Select data-testid="select" onChange={handleChange}>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
          </Select>
        </Field>
      </Form>
    ));

    fireEvent.change(screen.getByTestId('select'), { target: { value: 'us' } });

    expect((screen.getByTestId('select') as HTMLSelectElement).value).toBe('us');
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should apply error class when touched and invalid', () => {
    const errorSchema = z.object({ country: z.string().min(3) });
    render(() => (
      <Form schema={errorSchema} value={{ country: 'u' }}>
        <Field name="country">
          <Select data-testid="select-err" class="my-select" errorClass="select-err">
            <option value="us">US</option>
            <option value="uk">UK</option>
          </Select>
        </Field>
      </Form>
    ));

    const select = screen.getByTestId('select-err');
    fireEvent.change(select, { target: { value: 'us' } });
    expect(select.className).toContain('select-err');
  });

  it('should fallback to default options when errorClass is omitted', () => {
    const errorSchema = z.object({ country: z.string().min(3) });
    render(() => (
      <Form schema={errorSchema} value={{ country: 'uk' }}>
        <Field name="country">
          <Select data-testid="select-fallback">
            <option value="us">US</option>
            <option value="uk">UK</option>
          </Select>
        </Field>
      </Form>
    ));
    fireEvent.change(screen.getByTestId('select-fallback'), { target: { value: 'us' } });
  });

  it('should support multiple select', () => {
    const arraySchema = z.object({ countries: z.array(z.string()) });
    render(() => (
      <Form schema={arraySchema} value={{ countries: [] }}>
        <Field name="countries">
          <Select data-testid="select-multi" multiple>
            <option value="us">US</option>
            <option value="uk">UK</option>
          </Select>
        </Field>
      </Form>
    ));
    const select = screen.getByTestId('select-multi') as HTMLSelectElement;
    expect(select.multiple).toBe(true);
  });

  it('should cover all class branches for error in Select', () => {
    const errorSchema = z.object({ country: z.string().min(3) });
    render(() => (
      <Form schema={errorSchema} value={{ country: 'u' }}>
        <Field name="country">
          <Select data-testid="select-c" class="my-c" />
          <Select data-testid="select-e" errorClass="my-e" />
          <Select data-testid="select-ce" class="my-c" errorClass="my-e" />
          <Select data-testid="select-none" />
        </Field>
      </Form>
    ));
    fireEvent.change(screen.getByTestId('select-c'), { target: { value: 'us' } });
    fireEvent.change(screen.getByTestId('select-e'), { target: { value: 'us' } });
    fireEvent.change(screen.getByTestId('select-ce'), { target: { value: 'us' } });
    fireEvent.change(screen.getByTestId('select-none'), { target: { value: 'us' } });
  });
});

describe('Textarea', () => {
  const schema = z.object({ bio: z.string() });

  it('should render a textarea with value', () => {
    render(() => (
      <Form schema={schema} value={{ bio: 'Hello world' }}>
        <Field name="bio">
          <Textarea data-testid="textarea" />
        </Field>
      </Form>
    ));

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe('Hello world');
  });

  it('should update on input and settle on blur', async () => {
    const handleInput = vi.fn();
    const handleBlur = vi.fn();

    render(() => (
      <Form schema={schema} value={{ bio: 'Hello' }}>
        <Field name="bio">
          <Textarea data-testid="textarea" onInput={handleInput} onBlur={handleBlur} />
        </Field>
      </Form>
    ));

    const textarea = screen.getByTestId('textarea');
    fireEvent.input(textarea, { target: { value: 'Updated bio' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('Updated bio');
    expect(handleInput).toHaveBeenCalledTimes(1);

    fireEvent.blur(textarea);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should apply error class when touched and invalid', () => {
    const errorSchema = z.object({ bio: z.string().min(10) });

    render(() => (
      <Form schema={errorSchema} value={{ bio: 'Hello' }}>
        <Field name="bio">
          <Textarea data-testid="textarea-err" errorClass="text-err" />
        </Field>
      </Form>
    ));

    const textarea = screen.getByTestId('textarea-err');
    fireEvent.input(textarea, { target: { value: 'Hi' } });
    expect(textarea.className).toContain('text-err');
  });

  it('should fallback to default options when errorClass is omitted', () => {
    const errorSchema = z.object({ bio: z.string().min(10) });
    render(() => (
      <Form schema={errorSchema} value={{ bio: 'Hello' }}>
        <Field name="bio">
          <Textarea data-testid="textarea-fallback" />
        </Field>
      </Form>
    ));
    fireEvent.input(screen.getByTestId('textarea-fallback'), { target: { value: 'Hi' } });
  });
});

describe('FilePicker', () => {
  const schema = z.object({ avatar: z.string().optional() });

  it('should render a file input', () => {
    render(() => (
      <Form schema={schema} value={{ avatar: '' }}>
        <Field name="avatar">
          <FilePicker data-testid="file" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('file') as HTMLInputElement;
    expect(input.type).toBe('file');
  });

  it('should call onFiles and onChange on file selection', async () => {
    const handleFiles = vi.fn();
    const handleChange = vi.fn();

    render(() => (
      <Form schema={schema} value={{ avatar: '' }}>
        <Field name="avatar">
          <FilePicker data-testid="file" onFiles={handleFiles} onChange={handleChange} />
        </Field>
      </Form>
    ));

    fireEvent.change(screen.getByTestId('file'));

    expect(handleFiles).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should apply error class when touched and invalid', () => {
    const errorSchema = z.object({ avatar: z.string().min(5) });

    render(() => (
      <Form schema={errorSchema} value={{ avatar: '' }}>
        <Field name="avatar">
          <FilePicker data-testid="file-err" class="my-file" errorClass="file-err" />
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    const file = screen.getByTestId('file-err');
    const input = screen.getByTestId('input');

    act(() => {
      fireEvent.input(input, { target: { value: 'A' } });
    });

    fireEvent.change(file);
    expect(file.className).toContain('file-err');
  });

  it('should fallback to default options when errorClass is omitted', () => {
    const errorSchema = z.object({ avatar: z.string().min(5) });
    render(() => (
      <Form schema={errorSchema} value={{ avatar: '' }}>
        <Field name="avatar">
          <FilePicker data-testid="file-fallback" />
        </Field>
      </Form>
    ));
    fireEvent.change(screen.getByTestId('file-fallback'));
  });

  it('should cover all class branches for error in FilePicker', () => {
    const errorSchema = z.object({ avatar: z.string().min(5) });
    render(() => (
      <Form schema={errorSchema} value={{ avatar: '' }}>
        <Field name="avatar">
          <FilePicker data-testid="file-c" class="my-c" />
          <FilePicker data-testid="file-e" errorClass="my-e" />
          <FilePicker data-testid="file-ce" class="my-c" errorClass="my-e" />
          <FilePicker data-testid="file-none" />
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: 'A' } });

    fireEvent.change(screen.getByTestId('file-c'));
    fireEvent.change(screen.getByTestId('file-e'));
    fireEvent.change(screen.getByTestId('file-ce'));
    fireEvent.change(screen.getByTestId('file-none'));
  });

  it('should apply base class when touched and valid', () => {
    const validSchema = z.object({ avatar: z.string() });
    render(() => (
      <Form schema={validSchema} value={{ avatar: '' }}>
        <Field name="avatar">
          <FilePicker data-testid="file-valid" class="my-valid-class" />
          <TextInput data-testid="input-valid" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input-valid');
    fireEvent.input(input, { target: { value: 'Valid string' } });

    const file = screen.getByTestId('file-valid');
    fireEvent.change(file);
    expect(file.className).toContain('my-valid-class');
  });
});

describe('FieldList', () => {
  const schema = z.object({ tags: z.array(z.string()).default([]) });

  it('should render array items', () => {
    render(() => (
      <Form schema={schema} value={{ tags: ['react', 'vue'] }}>
        <FieldList name="tags">
          {(items: any[]) => (
            <ul data-testid="list">
              <For each={items}>{(item, i) => <li data-testid={`tag-${i()}`}>{String(item)}</li>}</For>
            </ul>
          )}
        </FieldList>
      </Form>
    ));

    expect(screen.getByTestId('tag-0').textContent).toBe('react');
    expect(screen.getByTestId('tag-1').textContent).toBe('vue');
  });

  it('should initialize empty array if field value is not an array', () => {
    const noDefault = z.object({ items: z.any() });

    render(() => (
      <Form schema={noDefault} value={{ items: 'not-an-array' }}>
        <FieldList name="items">{(items: any[]) => <span data-testid="count">{items.length}</span>}</FieldList>
      </Form>
    ));

    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('should support array mutations like push()', async () => {
    render(() => (
      <Form schema={schema} value={{ tags: ['react'] }}>
        <FieldList name="tags">
          {(items: any[]) => (
            <>
              <ul data-testid="list">
                <For each={items}>{(item, i) => <li data-testid={`tag-${i()}`}>{String(item)}</li>}</For>
              </ul>
              <button data-testid="add-tag" onClick={() => items.push('vue')}>
                Add Tag
              </button>
            </>
          )}
        </FieldList>
      </Form>
    ));

    expect(screen.getByTestId('tag-0').textContent).toBe('react');
    expect(screen.queryByTestId('tag-1')).toBeNull();

    fireEvent.click(screen.getByTestId('add-tag'));

    expect(screen.getByTestId('tag-1').textContent).toBe('vue');
  });

  it('should render an error when name is not provided for generic FieldList', () => {
    const Schema = z.object({ tags: z.array(z.string()).default([]) });
    render(() => (
      <Form schema={Schema} value={{ tags: ['react', 'vue'] }}>
        <FieldList name={'' as any}>{(items: any[]) => <span>{items.length}</span>}</FieldList>
      </Form>
    ));
    expect(screen.getByText('[FieldListError]: Name property is required!')).toBeDefined();
  });
});

describe('FormReset', () => {
  const schema = z.object({ name: z.string() });

  it('should render a reset button', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormReset data-testid="reset">Reset</FormReset>
      </Form>
    ));

    const btn = screen.getByTestId('reset') as HTMLButtonElement;
    expect(btn.type).toBe('button');
    expect(btn.textContent).toBe('Reset');
  });

  it('should be disabled when form has no changes', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormReset data-testid="reset">Reset</FormReset>
      </Form>
    ));

    expect((screen.getByTestId('reset') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should enable after form change and call onClick', async () => {
    const handleClick = vi.fn();

    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormReset data-testid="reset" onClick={handleClick}>
          Reset
        </FormReset>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });

    const btn = screen.getByTestId('reset') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);

    fireEvent.click(btn);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should support render function children', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormReset data-testid="reset">{(form: any) => (form?.changed ? 'Discard' : 'No changes')}</FormReset>
      </Form>
    ));

    expect(screen.getByTestId('reset').textContent).toBe('No changes');
  });

  it('should call form clear when clear prop is true', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormReset data-testid="reset-clear" clear>
          Clear
        </FormReset>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });

    const btn = screen.getByTestId('reset-clear');
    fireEvent.click(btn);
  });
});
