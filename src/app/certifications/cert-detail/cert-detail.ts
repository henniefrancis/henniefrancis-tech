import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CERT_DETAILS } from './cert-details.data';

const TYPE_NAME: Record<string, string> = {
  mcts: 'Microsoft Certified Technology Specialist',
  mcpd: 'Microsoft Certified Professional Developer',
  mcitp: 'Microsoft Certified IT Professional',
  mct: 'Microsoft Certified Trainer',
};

@Component({
  selector: 'app-cert-detail',
  imports: [RouterLink],
  templateUrl: './cert-detail.html',
})
export class CertDetail {
  readonly type = input.required<string>();
  readonly id = input.required<string>();

  protected readonly data = computed<{ title: string; image: string } | null>(
    () => CERT_DETAILS[`${this.type()}/${this.id()}`] ?? null,
  );
  protected readonly typeName = computed(() => TYPE_NAME[this.type()] ?? 'Microsoft');
}
